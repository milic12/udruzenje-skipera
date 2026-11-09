import {defineArrayMember, defineField, defineType} from 'sanity'
import {ImageIcon} from '@sanity/icons/Image'

export const blockContent = defineType({
  name: 'blockContent',
  title: 'Sadržaj',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normalan tekst', value: 'normal'},
        {title: 'Naslov 2', value: 'h2'},
        {title: 'Naslov 3', value: 'h3'},
        {title: 'Citat', value: 'blockquote'},
      ],
      lists: [
        {title: 'Lista', value: 'bullet'},
        {title: 'Numerisana lista', value: 'number'},
      ],
      marks: {
        annotations: [
          defineArrayMember({
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                title: 'URL',
                type: 'url',
                validation: (rule) =>
                  rule.uri({scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true}),
              }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      icon: ImageIcon,
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternativni tekst',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
        defineField({name: 'caption', title: 'Opis slike', type: 'string'}),
      ],
    }),
  ],
})
