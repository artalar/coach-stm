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
    "@babel/plugin-proposal-object-rest-spread"
  ]
};
