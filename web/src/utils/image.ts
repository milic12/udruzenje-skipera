import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import { sanityClient } from 'sanity:client';

const builder = createImageUrlBuilder(sanityClient);

/** Build a Sanity CDN image URL (respects crop + hotspot set in the Studio). */
export function urlFor(source: SanityImageSource) {
	return builder.image(source).auto('format');
}
