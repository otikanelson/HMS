module.exports = {
  extends: [
    'react-app'
  ],
  rules: {
    // Disable TypeScript-specific rules to avoid configuration issues
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off'
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react']
    }
  }
};