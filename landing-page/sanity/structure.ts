import { StructureBuilder } from 'sanity/structure'
import {
  HomeIcon,
  DocumentIcon,
  UsersIcon,
  StarIcon,
  HelpCircleIcon,
  CubeIcon,
  CalendarIcon,
  CaseIcon,
  CogIcon,
  LinkIcon,
  MenuIcon,
  BookIcon,
  EditIcon,
  ClipboardIcon,
} from '@sanity/icons'

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Nexa Academy')
    .items([
      // --- Singletons ---
      S.listItem()
        .title('Home Page')
        .icon(HomeIcon)
        .child(S.document().schemaType('homePage').documentId('homePage')),

      S.listItem()
        .title('Appointments Page')
        .icon(CalendarIcon)
        .child(S.document().schemaType('appointmentsPage').documentId('appointmentsPage')),

      S.divider(),

      // --- Pages ---
      S.listItem()
        .title('Pages')
        .icon(DocumentIcon)
        .child(S.documentTypeList('page').title('Pages')),

      S.divider(),

      // --- Programs ---
      S.listItem()
        .title('Programs')
        .icon(BookIcon)
        .child(S.documentTypeList('program').title('Programs')),

      S.divider(),

      // --- Blog ---
      S.listItem()
        .title('Blog')
        .icon(EditIcon)
        .child(S.documentTypeList('blogPost').title('Blog Posts')),

      S.divider(),

      // --- Content Library ---
      S.listItem()
        .title('Content Library')
        .icon(StarIcon)
        .child(
          S.list()
            .title('Content Library')
            .items([
              S.listItem()
                .title('Testimonials')
                .icon(StarIcon)
                .child(S.documentTypeList('testimonial').title('Testimonials')),
              S.listItem()
                .title('FAQs')
                .icon(HelpCircleIcon)
                .child(S.documentTypeList('faq').title('FAQs')),
              S.listItem()
                .title('Partners')
                .icon(CubeIcon)
                .child(S.documentTypeList('partner').title('Partners')),
              S.listItem()
                .title('Team Members')
                .icon(UsersIcon)
                .child(S.documentTypeList('teamMember').title('Team Members')),
            ])
        ),

      S.divider(),

      // --- Other Content ---
      S.listItem()
        .title('Other Content')
        .icon(CalendarIcon)
        .child(
          S.list()
            .title('Other Content')
            .items([
              S.listItem()
                .title('Events')
                .icon(CalendarIcon)
                .child(S.documentTypeList('event').title('Events')),
              S.listItem()
                .title('Careers')
                .icon(CaseIcon)
                .child(S.documentTypeList('career').title('Career Openings')),
            ])
        ),

      S.divider(),

      // --- Settings ---
      S.listItem()
        .title('Settings')
        .icon(CogIcon)
        .child(
          S.list()
            .title('Settings')
            .items([
              S.listItem()
                .title('Site Settings')
                .icon(CogIcon)
                .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
              S.listItem()
                .title('Navigation')
                .icon(MenuIcon)
                .child(S.document().schemaType('navigation').documentId('navigation')),
              S.listItem()
                .title('Footer')
                .icon(LinkIcon)
                .child(S.document().schemaType('footer').documentId('footer')),
            ])
        ),
    ])
