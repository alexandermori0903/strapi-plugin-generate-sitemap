'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('generate-sitemap')
      .service('myService')
      .getWelcomeMessage();
  },
});
