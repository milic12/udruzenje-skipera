import {defineArrayMember, defineField, defineType} from 'sanity'
import {CalendarIcon} from '@sanity/icons/Calendar'

export const activity = defineType({
  name: 'activity',
  title: 'Aktivnosti',
  type: 'document',
  icon: CalendarIcon,
  groups: [
    {name: 'content', title: 'Sadržaj', default: true},
    {name: 'meeting', title: 'Detalji sastanka'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Naslov',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL (slug)',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Datum održavanja',
      type: 'date',
      group: 'content',
      options: {dateFormat: 'DD.MM.YYYY.'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Mjesto',
      type: 'string',
      group: 'content',
      description: 'npr. Kulturni centar, Kotor',
    }),
    defineField({
      name: 'lead',
      title: 'Uvod',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'Kratka uvodna rečenica — prikazuje se na listi i kao SEO opis.',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'mainImage',
      title: 'Glavna slika',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternativni tekst',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Tekst',
      type: 'blockContent',
      group: 'content',
    }),
    defineField({
      name: 'gallery',
      title: 'Dodatne fotografije',
      type: 'array',
      group: 'content',
      options: {layout: 'grid'},
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Alternativni tekst', type: 'string'})],
        }),
      ],
    }),

    // Optional — fill in for meetings
    defineField({
      name: 'attendanceInPerson',
      title: 'Prisutno uživo',
      type: 'number',
      group: 'meeting',
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: 'attendanceOnline',
      title: 'Prisutno online',
      type: 'number',
      group: 'meeting',
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: 'guests',
      title: 'Gosti',
      type: 'array',
      group: 'meeting',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'guest',
          fields: [
            defineField({name: 'name', title: 'Ime i prezime', type: 'string'}),
            defineField({
              name: 'role',
              title: 'Funkcija',
              type: 'string',
              description: 'npr. predstavnik Lučke kapetanije',
            }),
          ],
          preview: {select: {title: 'name', subtitle: 'role'}},
        }),
      ],
    }),
  ],
  orderings: [
    {title: 'Datum (najnovije)', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', date: 'date', media: 'mainImage'},
    prepare: ({title, date, media}) => ({
      title,
      subtitle: date ? new Date(date).toLocaleDateString('sr-Latn-ME') : 'Bez datuma',
      media,
    }),
  },
})
