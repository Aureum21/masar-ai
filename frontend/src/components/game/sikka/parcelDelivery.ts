/**
 * Merchant's Delivery Run:
 * Slice 1: Offer, collect, and carry parcel from opening textile merchant.
 * Slice 2: Handover to the coffee host at Bait Al Gahwa (Chunk 2, ~100m) and unlock story card.
 */
export type ParcelStatus = 'available' | 'carrying' | 'delivered' | 'missed';
export type ParcelPhase = 'ready' | 'countdown' | 'running' | 'zooming' | 'ended';

// The opening shop is centred at 18m. Close the offer just after passing it.
export const PARCEL_PICKUP_END_METRES = 24;

// The coffee courtyard (Chunk 2) is centred at 100m. Generous ~3-4 second delivery window.
export const PARCEL_DELIVERY_START_METRES = 82;
export const PARCEL_DELIVERY_END_METRES = 118;
export const COFFEE_COURTYARD_DISTANCE = 100;

export interface DeliveryStoryCard {
  id: string;
  title: string;
  arabicTitle: string;
  category: string;
  description: string;
  heritageFact: string;
  unlockedAtDistance: number;
}

export const GAHWA_STORY_CARD: DeliveryStoryCard = {
  id: 'gahwa-courtyard',
  title: 'Bait Al Gahwa • Coffee Courtyard',
  arabicTitle: 'بيت القهوة والمجلس التراثي',
  category: 'Emirati Hospitality',
  description: "Handed over the merchant's silk parcel to the Gahwa host on the shaded wooden dakka, greeted with fresh cardamom coffee and warm Emirati hospitality.",
  heritageFact: "Arabic coffee (Gahwa) served from the golden dallah into finjan cups is inscribed on UNESCO's Representative List of Intangible Cultural Heritage of Humanity.",
  unlockedAtDistance: 100,
};

export class ParcelPickup {
  public status: ParcelStatus = 'available';

  collect(phase: ParcelPhase, distance: number): boolean {
    if (phase !== 'ready' && phase !== 'running') return false;
    if (!Number.isFinite(distance) || distance < 0) return false;
    this.advance(distance);
    if (this.status !== 'available') return false;
    this.status = 'carrying';
    return true;
  }

  isDeliveryAvailable(phase: ParcelPhase, distance: number): boolean {
    if (phase !== 'running') return false;
    if (this.status !== 'carrying') return false;
    if (!Number.isFinite(distance) || distance < 0) return false;
    return distance >= PARCEL_DELIVERY_START_METRES && distance <= PARCEL_DELIVERY_END_METRES;
  }

  deliver(phase: ParcelPhase, distance: number): boolean {
    if (!this.isDeliveryAvailable(phase, distance)) return false;
    this.status = 'delivered';
    return true;
  }

  advance(distance: number): void {
    if (this.status === 'available' && distance > PARCEL_PICKUP_END_METRES) {
      this.status = 'missed';
    }
  }

  reset(): void {
    this.status = 'available';
  }
}
