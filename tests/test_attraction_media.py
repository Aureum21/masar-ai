"""No AWS network or database access: private image signing and safe fallbacks."""
import os
os.environ['MASAR_ENV'] = 'test'
import unittest
from unittest.mock import Mock, patch
from services import attraction_media as media

class AttractionMedia(unittest.TestCase):
    def setUp(self):
        media._urls.clear()
        media._unavailable.clear()
        self.photo = {'local_path': '/attraction-photos/fixture.webp', 'object_key': 'attractions/fixture/hash.webp'}

    def test_test_mode_uses_local_copy_without_aws(self):
        with patch.object(media, 's3_client') as client:
            self.assertEqual(media.photo_url(self.photo), self.photo['local_path'])
            client.assert_not_called()

    def test_signs_private_object_and_caches_without_mutating_record(self):
        client = Mock()
        client.generate_presigned_url.return_value = 'https://fixture.example/photo?signed=yes'
        with patch.dict(os.environ, {'MASAR_ENV': 'test-signing', 'S3_BUCKET_NAME': 'fixture', 'S3_PHOTO_URL_TTL': '3600'}), patch.object(media, 'load_environment'), patch.object(media, 's3_client', return_value=client):
            place = {'id': 'fixture', 'images': [self.photo['local_path']], 'photoAssets': [self.photo]}
            first = media.hydrate_images(place)
            self.assertEqual(first['images'], ['https://fixture.example/photo?signed=yes'])
            self.assertEqual(first['imageFallbacks'], [self.photo['local_path']])
            self.assertEqual(place['images'], [self.photo['local_path']])
            media.hydrate_images(place)
            client.generate_presigned_url.assert_called_once_with('get_object', Params={'Bucket': 'fixture', 'Key': self.photo['object_key']}, ExpiresIn=3600)

    def test_expired_credentials_or_unsafe_keys_fall_back(self):
        with patch.dict(os.environ, {'MASAR_ENV': 'test-signing', 'S3_BUCKET_NAME': 'fixture'}), patch.object(media, 'load_environment'), patch.object(media, 's3_client', side_effect=RuntimeError('credentials unavailable')):
            self.assertEqual(media.photo_url(self.photo), self.photo['local_path'])
            self.assertEqual(media.photo_url({**self.photo, 'object_key': '../private'}), self.photo['local_path'])

    def test_failed_login_is_not_retried_for_every_photo(self):
        with patch.dict(os.environ, {'MASAR_ENV':'test-signing','S3_BUCKET_NAME':'fixture'}), patch.object(media,'load_environment'), patch.object(media,'s3_client',side_effect=RuntimeError('private provider details')) as client:
            with self.assertLogs(media.log,level='WARNING') as logs:
                for i in range(40):
                    self.assertEqual(media.photo_url({**self.photo,'object_key':f'attractions/{i}.webp'}), self.photo['local_path'])
            self.assertEqual(client.call_count,1)
            self.assertEqual(len(logs.output),1)
            self.assertNotIn('private provider details',logs.output[0])

    def test_credentials_are_retried_after_cooldown(self):
        client=Mock();client.generate_presigned_url.return_value='https://fixture.example/photo'
        with patch.dict(os.environ, {'MASAR_ENV':'test-signing','S3_BUCKET_NAME':'fixture'}), patch.object(media,'load_environment'), patch.object(media,'s3_client',side_effect=[RuntimeError('expired'),client]) as get_client, patch.object(media.time,'monotonic',return_value=100) as clock:
            self.assertEqual(media.photo_url(self.photo),self.photo['local_path'])
            clock.return_value=161
            self.assertEqual(media.photo_url(self.photo),'https://fixture.example/photo')
            self.assertEqual(get_client.call_count,2)

    def test_other_requests_do_not_wait_for_in_progress_signing(self):
        with patch.dict(os.environ, {'MASAR_ENV':'test-signing','S3_BUCKET_NAME':'fixture'}), patch.object(media,'load_environment'), patch.object(media,'s3_client') as client:
            media._signing.acquire()
            try:self.assertEqual(media.photo_url(self.photo),self.photo['local_path'])
            finally:media._signing.release()
            client.assert_not_called()

    def test_reviewed_files_and_licenses_have_matching_checksums(self):
        from tools.upload_attraction_photos import reviewed_photos
        self.assertGreaterEqual(len(reviewed_photos()), 35)


class CatalogueHydration(unittest.IsolatedAsyncioTestCase):
    async def test_slow_aws_signing_does_not_block_catalogue(self):
        import time
        place={'id':'fixture','title':'Actual destination','photoAssets':[{'local_path':'/attraction-photos/fixture.webp','object_key':'attractions/fixture.webp'}]}
        def slow(_):
            time.sleep(.05)
            return {'images':['https://private.example/signed']}
        with patch.object(media,'photo_url',side_effect=slow):
            result=await media.hydrate_catalogue_images([place],timeout=.005)
        self.assertEqual(result[0]['id'],'fixture')
        self.assertEqual(result[0]['images'],['/attraction-photos/fixture.webp'])
        self.assertEqual(result[0]['imageFallbacks'],['/attraction-photos/fixture.webp'])
        self.assertNotIn('images',place)
