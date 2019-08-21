module.exports = {
  title: 'PulseJS',
  description: 'Application logic library for reactive Javascript frameworks',
  dest: 'dist',
  serviceWorker: true,
  base: '/',
  plugins: [
    // you can use it multiple times
    // so babel-style may be a better choice
    ['container', {
      type: 'warning',
      before: info => `<div class="container-warning">${info}`,
      after: '</div>',
    }],
    ['container', {
      type: 'tip',
      before: info => `<div class="container-tip">${info}`,
      after: '</div>',
    }],
    ['container', {
      type: 'note',
      before: info => `<div class="container-note">${info}`,
      after: '</div>',
    }],
    ['container', {
      type: 'flex',
      before: info => `<div class="flex">${info}`,
      after: '</div>',
    }],
  ],
  postcss: {
    plugins: [
        require('tailwindcss')('./tailwind.config.js'),
        require('autoprefixer'),
    ]
  },
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/introduction/what-is-pulse' }
    ],
    lastUpdated: 'Last Updated',
    // Assumes GitHub. Can also be a full GitLab url.
    repo: 'jamiepine/pulse',
    // Customising the header label
    // Defaults to "GitHub"/"GitLab"/"Bitbucket" depending on `themeConfig.repo`
    repoLabel: 'Contribute!',
    // if your docs are not at the root of the repo:
    docsDir: 'docs',
    // if your docs are in a specific branch (defaults to 'master'):
    docsBranch: 'master',
    // defaults to false, set to true to enable
    editLinks: true,
    // custom text for edit link. Defaults to "Edit this page"
    editLinkText: 'Help us improve this page!',
    serviceWorker: {
      updatePopup: true
    },
    markdown: {
      /**
       * Add class named to html generated by Markdown
       */
      lineNumbers: true,
      anchor: { permalink: false }
    },
    
    sidebar: [
      { 
        text: 'Introduction',
        children: [
          { title: 'What Is Pulse?', link: '/introduction/what-is-pulse'}, 
        ]
      },
      { 
        text: 'Getting Started', 
        children: [
          { title: 'Setup With ReactJS', link: '/getting-started/setup-with-react'},
          { title: 'Setup With VueJS', link: '/getting-started/setup-with-vue'}
        ]
      },
      { 
        text: 'Guide', 
        children: [
          { title: 'Pulse Library', link: '/guide/library'}, 
          { title: 'Collections', link: '/guide/collections'}, 
          { title: 'Namespacing', link: '/guide/namespacing'}, 
          { title: 'Using Data', link: '/guide/using-data'}, 
          { title: 'Persisting Data', link: '/guide/persisting-data'}, 
          { title: 'Mutating Data', link: '/guide/mutating-data'}, 
          { title: 'Context Object', link: '/guide/context-object'}, 
          { title: 'Filters', link: '/guide/filters'}, 
          { title: 'Data Relations', link: '/guide/data-relations'}, 
          { title: 'HTTP Requests', link: '/guide/http-requests'}, 
          { title: 'Models', link: '/guide/models'}, 
          { title: 'Debugging', link: '/guide/debugging'}, 
        ]
      },
      { 
        text: 'Examples', 
        children: [
          //     // These are pages we'll add later
          //     //   '/examples/UsageWithVueJS',
          //     //   '
          // { title: 'Authentication', link: '/examples/authentication'},
          // { title: 'Usage with VueJS', link: '/examples/UsageWithVueJS'},
        ]
      }
    ]
  }
};