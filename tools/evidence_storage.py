"""Private evidence preflight, migration and deletion retry commands."""
import argparse
import asyncio
import json
from config.runtime import load_environment


async def run(args):
    load_environment()
    from passport import evidence_storage as storage
    if args.command == 'check':
        # No evidence is uploaded by this command.
        ref = storage.new_s3_ref(args.user_id or 1, '0'*32+'.png')
        await asyncio.to_thread(storage.require_private,storage.client_for(ref),ref['bucket'])
        print('Private bucket protections verified. No evidence uploaded.')
        return
    from database import AsyncSessionLocal,engine
    try:
        if args.command == 'migrate':
            from passport.migrate_evidence import migrate
            result = await migrate(AsyncSessionLocal,apply=args.apply,user_id=args.user_id,limit=args.limit)
            print(json.dumps({'mode':'apply' if args.apply else 'dry-run',**result}))
            if result['failed']:
                raise RuntimeError('Some photos were not migrated. Existing local references and originals were kept.')
        else:
            from passport.evidence_cleanup import process_deletions
            count = await process_deletions(AsyncSessionLocal,limit=args.limit)
            print(f'Completed {count} pending evidence deletions. Failed deletions remain queued.')
    finally:
        await engine.dispose()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['check','migrate','cleanup'])
    parser.add_argument('--apply',action='store_true',help='Upload and link legacy evidence; default is a read-only dry run.')
    parser.add_argument('--user-id',type=int)
    parser.add_argument('--limit',type=int,default=100)
    args=parser.parse_args()
    if not 1 <= args.limit <= 10000:
        parser.error('--limit must be 1–10000')
    try:
        asyncio.run(run(args))
    except Exception as error:
        print(f'Evidence storage command failed ({type(error).__name__}). Check AWS login, private bucket access, configuration and database migration.')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
