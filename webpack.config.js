const createExpoWebpackConfigAsync = require('@expo/webpack-config')

module.exports = async function (env, argv) {
  // Expo prevents you from using development environment in production by default.
  // Since the tool is only available in development, we'll overrride the config here
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      mode: 'development',
      development: true,
      production: false,
    },
    argv
  )
  // Customize the config before returning it.
  return config
}
