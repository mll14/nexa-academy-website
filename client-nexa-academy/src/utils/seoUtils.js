// SEO Utility functions for updating page metadata
export const updatePageTitle = (title) => {
  document.title = title;
};

export const updatePageMeta = (name, content) => {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

export const updateOGMeta = (property, content) => {
  let element = document.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

// Page-specific SEO configurations
export const seoConfig = {
  home: {
    title: 'Nexa Academy - Tech School & Certification Programs',
    description: 'High-quality tech education and certification Programs for aspiring developers and tech professionals. Learn from industry experts.',
    keywords: 'tech school, coding Programs, certification, software development, programming training',
  },
  Programs: {
    title: 'Programs - Nexa Academy Tech School',
    description: 'Explore our comprehensive range of tech certification Programs including Web Development, Cloud Computing, Data Science, and more.',
    keywords: 'tech Programs, certification programs, web development, cloud computing, data science',
  },
  apply: {
    title: 'Apply Now - Nexa Academy Certification Programs',
    description: 'Start your journey toward tech excellence. Apply now for our certification programs and transform your career.',
    keywords: 'apply Programs, certification application, tech training registration',
  },
  faq: {
    title: 'FAQ - Nexa Academy',
    description: 'Find answers to frequently asked questions about our Programs, certification programs, and enrollment process.',
    keywords: 'FAQ, frequently asked questions, Program information, certification details',
  },
  contact: {
    title: 'Contact Us - Nexa Academy',
    description: 'Get in touch with our team at Nexa Academy. We\'re here to help answer your questions about our tech Programs and programs.',
    keywords: 'contact, support, customer service, nexa academy',
  },
  admin: {
    title: 'Admin Dashboard - Nexa Academy',
    description: 'Administrator panel for managing applications, students, and Programs.',
    keywords: 'admin, dashboard, management',
  },
};

// Function to set page SEO metadata
export const setSeoData = (pageKey) => {
  const config = seoConfig[pageKey];
  if (config) {
    updatePageTitle(config.title);
    updatePageMeta('description', config.description);
    updatePageMeta('keywords', config.keywords);
    updateOGMeta('og:title', config.title);
    updateOGMeta('og:description', config.description);
  }
};

// Structured Data (Schema.org JSON-LD)
export const generateOrganizationSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Nexa Academy',
    description: 'Tech education platform offering certification Programs',
    url: 'https://nexa-academy.vercel.app',
    logo: 'https://nexa-academy.vercel.app/logo.svg',
    sameAs: [
      'https://twitter.com/nexaacademy',
      'https://facebook.com/nexaacademy',
    ],
  };
};

export const injectJsonLd = (schema) => {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
};
