module.exports = {
  presets: [
    [
      "@babel/env",
      {
        targets: {
          browsers: ["ie 11"]
        }
      }
    ]
  ],
  plugins: [
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-proposal-object-rest-spread",
    ["@babel/plugin-transform-runtime", {
      "polyfill": false,
      "regenerator": true
    }]
  ]
};
