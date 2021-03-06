import {readFileSync} from 'fs';
import {resolve} from 'path';
import * as webpack from 'webpack';

import {Configuration, Https, defaultConfiguration, loadConfigurationEntry} from './configuration';
import {loadEnvironment} from './environment';
import {setupCssPipeline} from './scss';
import {setupPlugins} from './plugins';
import {setupRules, setupResolvers} from './rules';
import {setupServiceWorker} from './service-worker';

export type Hook = (configuration: webpack.Configuration) => webpack.Configuration;

export * from './configuration';
export * from './environment';
export * from './icons';
export * from './plugins';
export * from './rules';
export * from './scss';

export function setupServer(configuration: Configuration): any{
  const server = configuration.server || {};
  const defaultServer = defaultConfiguration.server;
  const https = loadConfigurationEntry<Https | boolean>('https', server, defaultServer);

  let config: any = {
    host: loadConfigurationEntry('host', server, defaultServer),
    port: loadConfigurationEntry('port', server, defaultServer),
    historyApiFallback: loadConfigurationEntry('historyApiFallback', server, defaultServer),
    compress: loadConfigurationEntry('compress', server, defaultServer),
    hot: loadConfigurationEntry('hot', server, defaultServer)
  };

  if(https){
    config.https = {
      key: (https as Https).key || readFileSync(resolve(process.cwd(), (defaultServer.https as Https).key)),
      cert: (https as Https).cert || readFileSync(resolve(process.cwd(), (defaultServer.https as Https).cert))
    };
  }

  if(typeof server.afterHook === 'function')
    config = server.afterHook(config);

  return config;
}

export function setup(env: string, configuration: Configuration, afterHook?: Hook): webpack.Configuration{
  if(!env)
    env = 'development';

  if(!configuration.environment)
    configuration.environment = env;

  const environment = loadEnvironment(configuration);
  const destination = resolve(process.cwd(), configuration.distFolder || defaultConfiguration.distFolder);
  const version = JSON.stringify(environment.version);

  const cssPipeline = setupCssPipeline(configuration);
  const plugins = setupPlugins(configuration, environment);

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

  if(env === 'production')
    config = setupServiceWorker(config, configuration);

  if(typeof afterHook === 'function')
    config = afterHook(config);

  return config;
}
