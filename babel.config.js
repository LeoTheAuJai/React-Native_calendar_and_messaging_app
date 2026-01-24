module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ... 其他插件
      'react-native-reanimated/plugin' // 必须放在最后
    ],
  };
};