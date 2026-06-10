import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemas } from './src/sanity/schemas'

const singletonTypes = new Set(['navigation', 'footer'])

export default defineConfig({
  name: 'nexa-academy',
  title: 'Nexa Academy CMS',
  projectId: (import.meta as any).env.VITE_SANITY_PROJECT_ID as string,
  dataset: ((import.meta as any).env.VITE_SANITY_DATASET as string) ?? 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Nexa Academy CMS')
          .items([
            S.listItem()
              .title('Content')
              .child(
                S.list()
                  .title('Content')
                  .items([
                    S.documentTypeListItem('blogPost').title('Blog Posts'),
                    S.documentTypeListItem('announcement').title('Announcements'),
                    S.documentTypeListItem('popupBanner').title('Pop-up Banners'),
                  ]),
              ),
            S.divider(),
            S.listItem()
              .title('Site Settings')
              .child(
                S.list()
                  .title('Site Settings')
                  .items([
                    S.listItem()
                      .title('Navigation')
                      .id('navigation')
                      .child(
                        S.document()
                          .schemaType('navigation')
                          .documentId('navigation')
                          .title('Navigation'),
                      ),
                    S.listItem()
                      .title('Footer')
                      .id('footer')
                      .child(
                        S.document()
                          .schemaType('footer')
                          .documentId('footer')
                          .title('Footer'),
                      ),
                    S.documentTypeListItem('siteSetting').title('Site Settings'),
                  ]),
              ),
            S.divider(),
            S.listItem()
              .title('Marketing')
              .child(
                S.list()
                  .title('Marketing')
                  .items([
                    S.documentTypeListItem('testimonial').title('Testimonials'),
                    S.documentTypeListItem('faq').title('FAQs'),
                    S.documentTypeListItem('homepageFeature').title('Homepage Features'),
                  ]),
              ),
            S.divider(),
            S.listItem()
              .title('Legal')
              .child(
                S.list()
                  .title('Legal')
                  .items([
                    S.documentTypeListItem('legalDocument').title('Legal Documents'),
                  ]),
              ),
          ]),
    }),
    visionTool(),
  ],
  schema: {
    types: schemas,
    // Prevent creating new "navigation" or "footer" documents — editors use the pinned singleton
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
})
