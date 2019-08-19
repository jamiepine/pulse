module.exports = {
  title: 'PulseJS',
  description: 'Application logic library for reactive Javascript frameworks',
  dest: 'dist',
  serviceWorker: true,
  base: '/',
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
      lineNumbers: true
    },
    sidebar: [
      // These links will appear in the sidebar
      // Create heading groups
      {
        title: 'Introduction',
        collapsable: false,
        children: [
          // These are pages we'll add later
          '/introduction/what-is-pulse'
        ]
      },
      {
        title: 'Getting Started',
        collapsable: false,
        children: [
          // These are pages we'll add later
          '/getting-started/setup-with-react',
          '/getting-started/setup-with-vue'
        ]
      },
      {
        title: 'Guide',
        collapsable: false,
        children: [
          // These are pages we'll add later
          '/guide/library',
          '/guide/collections',
          '/guide/namespacing',
          '/guide/using-data',
          '/guide/persisting-data',
          '/guide/mutating-data',
          '/guide/context-object',
          '/guide/filters',
          '/guide/data-relations',
          '/guide/http-requests',
          '/guide/models',
          '/guide/debugging'
        ]
      },
      {
        title: 'Examples',
        collapsable: false,
        children: [
          // These are pages we'll add later
          //   '/examples/UsageWithVueJS',
          //   '/examples/authentication'
        ]
      }
    ]
  }
};
