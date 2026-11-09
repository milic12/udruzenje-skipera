import { defineQuery } from 'groq';
import { sanityClient } from 'sanity:client';

export const ACTIVITIES_QUERY = defineQuery(`
  *[_type == "activity" && defined(slug.current)] | order(date desc) {
    _id,
    title,
    "slug": slug.current,
    date,
    location,
    lead,
    mainImage
  }
`);

export const ACTIVITY_QUERY = defineQuery(`
  *[_type == "activity" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    date,
    location,
    lead,
    mainImage,
    body,
    gallery,
    attendanceInPerson,
    attendanceOnline,
    guests[] { _key, name, role }
  }
`);

export function getActivities() {
	return sanityClient.fetch(ACTIVITIES_QUERY);
}

export function getActivity(slug: string) {
	return sanityClient.fetch(ACTIVITY_QUERY, { slug });
}
