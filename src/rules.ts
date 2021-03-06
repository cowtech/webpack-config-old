import {sep as pathSep} from 'path';

import {Configuration, Babel, loadConfigurationEntry} from './configuration';

export function normalizeIncludePath(path: string): string{
  const components = path.split(pathSep);

  if(components[0] === 'src')
      components.shift();
  else if(components[0] === 'node_modules'){
      components.splice(0, components[1][0] === '@' ? 3 : 2); // Remove the folder, the scope (if present) and the package
  }

  return components.join(pathSep);
}

export function setupRules(configuration: Configuration, cssPipeline: any, version: string){
  const babel = loadConfigurationEntry<Babel>('babel', configuration);
  const transpilers = loadConfigurationEntry<Array<string>>('transpilers', configuration);

  const babelEnv = ['env', {targets: {browsers: babel.browsersWhiteList}, exclude: babel.exclude}];

  let rules: Array<any> = [
    {test: /\.scss$/, use: cssPipeline},
    {
      test: /\.(?:png|jpg|svg)$/,
      use: [{loader: 'file-loader', options: {name: '[path][name].[ext]', outputPath: normalizeIncludePath, publicPath: normalizeIncludePath}}]
    },
    {
      test: /manifest\.json$/,
      use: [{loader: 'file-loader', options: {name: 'manifest.json'}}, {loader: 'string-replace-loader', query: {search: '@version@', replace: version}}]
    },
    {test: /robots\.txt$/, use: [{loader: 'file-loader', options: {name: 'robots\.txt'}}]}
  ];

  if(transpilers.includes('babel')){
    if(transpilers.includes('inferno')){
      rules.unshift({
        test: /\.jsx$/, exclude: /node_modules/,
        use: {loader: 'babel-loader', options: {presets: ['react', babelEnv], plugins: ['syntax-jsx', ['inferno', {imports: true}]]}}
      });
    }else if(transpilers.includes('react'))
      rules.unshift({test: /\.jsx$/, exclude: /node_modules/, use: {loader: 'babel-loader', options: {presets: ['react', babelEnv]}}});

    rules.unshift({test: /\.js$/, exclude: /node_modules/, use: {loader: 'babel-loader', options: {presets: [babelEnv]}}});
  }

  if(transpilers.includes('typescript')){
    if(transpilers.includes('inferno')){
      rules.unshift({
        test: /\.tsx$/,
        use: [
          {loader: 'babel-loader', options: {presets: [babelEnv], plugins: ['syntax-jsx', ['inferno', {imports: true}]]}},
          {loader: 'awesome-typescript-loader'}
        ]
      });
    }else if(transpilers.includes('react'))
      rules.unshift({test: /\.tsx$/, loader: 'awesome-typescript-loader'});

    rules.unshift({test: /\.ts$/, loader: 'awesome-typescript-loader'});
  }

  if(typeof configuration.afterRulesHook === 'function')
    rules = configuration.afterRulesHook(rules);

  return rules;
}

export function setupResolvers(configuration: Configuration): Array<string>{
  const transpilers = loadConfigurationEntry<Array<string>>('transpilers', configuration);
  const extensions = ['.json', '.js'];

  if(transpilers.includes('babel'))
    extensions.push('.jsx');

  if(transpilers.includes('typescript'))
    extensions.push('.ts', '.tsx');

  return extensions;
}
