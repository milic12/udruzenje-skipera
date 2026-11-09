import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getActivities } from '../utils/sanity';

export async function GET(context) {
	const activities = await getActivities();
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: activities.map((a) => ({
			title: a.title ?? '',
			description: a.lead ?? '',
			pubDate: a.date ? new Date(a.date) : undefined,
			link: `/aktivnosti/${a.slug}/`,
		})),
	});
}
