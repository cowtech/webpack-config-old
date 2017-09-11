import {readFileSync} from 'fs';
import {resolve} from 'path';
import * as webpack from 'webpack';

import {Configuration, Server, Https, defaultConfiguration} from './configuration';
import {loadEnvironment} from './environment';
import {setupCssPipeline} from './scss';
import {setupPlugins} from './plugins';
import {setupRules, setupResolvers} from './rules';

export type Hook = (configuration: webpack.Configuration) => webpack.Configuration;

export * from './configuration';
export * from './environment';
export * from './icons';
export * from './plugins';
export * from './rules';
export * from './scss';

export function setupServer(configuration: Configuration): any{
  const server: Server = configuration.server || {};
  const defaultServer: Server = defaultConfiguration.server;
  const https: Https | boolean = server.hasOwnProperty('https') ? server.https : defaultServer.https;

  const config: any = {
    host: server.host || defaultServer.host,
    port: server.port || defaultServer.port,
    historyApiFallback: server.hasOwnProperty('historyApiFallback') ? server.historyApiFallback : defaultServer.historyApiFallback,
    compress: server.hasOwnProperty('compress') ? server.compress : defaultServer.compress,
    hot: server.hasOwnProperty('hot') ? server.hot : defaultServer.hot
  };

  if(https){
    config.https = {
      key: (https as Https).key || readFileSync(resolve(process.cwd(), (defaultServer.https as Https).key)),
      cert: (https as Https).cert || readFileSync(resolve(process.cwd(), (defaultServer.https as Https).cert))
    };
  }

  return config;
}

export function setup(env: string, configuration: Configuration, afterHook?: Hook): webpack.Configuration{
  if(!env)
    env = 'development';

  if(!configuration.environment)
    configuration.environment = env;

  const environment: any = loadEnvironment(configuration);
  const destination: string = resolve(process.cwd(), configuration.distFolder || defaultConfiguration.distFolder);
  const version: string = JSON.stringify(environment.version);

  const cssPipeline: any = setupCssPipeline(configuration);
  const plugins: any = setupPlugins(configuration, environment);

  let config: webpack.Configuration = {
    entry: configuration.entries || defaultConfiguration.entries,
    output: {filename: '[name]', path: destination, publicPath: '/'},
    module: {
      rules: setupRules(configuration, cssPipeline, version)
    },
    resolve: {extensions: setupResolvers(configuration)},
    plugins,
    externals: configuration.externals,
    devtool: env === 'development' ? (configuration.sourceMapsType || defaultConfiguration.sourceMapsType) : false,
    devServer: {contentBase: destination, ...setupServer(configuration)}
  };

  if(typeof afterHook === 'function')
    config = afterHook(config);

  return config;
}