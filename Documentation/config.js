module.exports = {
  baseUrl: '/VeraInView',
  work: './build-tmp',
  config: {
    title: 'VeraInView',
    description: '"The Web Viewer for VERAin files"',
    subtitle: '"CASL simulation input file viewer."',
    author: 'DOE CASL',
    timezone: 'UTC',
    url: 'https://casl.github.io/VeraInView',
    root: '/VeraInView/',
    github: 'CASL/VeraInView',
  },
  copy: [
    {
      src: '../dist/*',
      dest: './build-tmp/public/latest',
    },
    {
      src: '../node_modules/@doe-casl/verain-view/dist/*',
      dest: './build-tmp/public/app',
    },
  ],
};
