import { defineQuery } from 'groq';
import { sanityClient } from 'sanity:client';

// Image + the metadata needed for width/height and a blurred placeholder.
// Kept inline in each query so TypeGen can evaluate them.

export const ACTIVITIES_QUERY = defineQuery(`
  *[_type == "activity" && defined(slug.current)] | order(date desc) {
    _id,
    title,
    "slug": slug.current,
    date,
    location,
    lead,
    mainImage { ..., "dimensions": asset->metadata.dimensions, "lqip": asset->metadata.lqip }
  }
`);

export const ACTIVITY_SLUGS_QUERY = defineQuery(`
  *[_type == "activity" && defined(slug.current)].slug.current
`);

export const ACTIVITY_QUERY = defineQuery(`
  *[_type == "activity" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    date,
    location,
    lead,
    mainImage { ..., "dimensions": asset->metadata.dimensions, "lqip": asset->metadata.lqip },
    body[] {
      ...,
      _type == "image" => { "dimensions": asset->metadata.dimensions, "lqip": asset->metadata.lqip }
    },
    gallery[] { ..., "dimensions": asset->metadata.dimensions, "lqip": asset->metadata.lqip },
    attendanceInPerson,
    attendanceOnline,
    guests[] { _key, name, role }
  }
`);

export function getActivities() {
	return sanityClient.fetch(ACTIVITIES_QUERY);
}

export function getActivitySlugs() {
	return sanityClient.fetch(ACTIVITY_SLUGS_QUERY);
}

export function getActivity(slug: string) {
	return sanityClient.fetch(ACTIVITY_QUERY, { slug });
}
