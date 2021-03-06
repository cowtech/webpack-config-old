import * as cheerio from 'cheerio';
import {readFileSync} from 'fs';
import {resolve} from 'path';

import {Configuration, IconsLoader, loadConfigurationEntry} from './configuration';

export function loadSVGIcon(path: string, tag: string): Cheerio{
  const icon = cheerio.load(readFileSync(path, 'utf-8'))('svg');

  icon.attr('id', tag);
  for(const attr of ['width', 'height'])
    icon.removeAttr(attr);

  return icon;
}

export function iconToString(icon: Cheerio): string{
  // Save the definition - as any is needed since .wrap is not in the type definitions yet
  return (icon as any).wrap('<div/>').parent().html().replace(/\n/mg, '').replace(/^\s+/mg, '');
}

export function fontAwesomeLoader(toLoad: Array<string>, loaderConfiguration?: IconsLoader): Icons{
  const library = cheerio.load(readFileSync(resolve(process.cwd(), loaderConfiguration.fontAwesomePath), 'utf-8'));

  const icons: Icons = {
    prefix: loaderConfiguration.prefix,
    tags: {},
    definitions: ''
  };

  icons.tags = library('symbol[id^=icon-]').toArray().reduce<{[key: string]: string}>((accu, dom, index) => {
    const icon = library(dom);
    const name = icon.attr('id').replace(/^icon-/g, '');
    const tag = `i${index}`;

    icon.attr('id', tag);
    icon.find('title').remove();
    for(const attr of ['width', 'height'])
      icon.removeAttr(attr);

    if(toLoad.includes(name)){
      // Save the definition - as any is needed since .wrap is not in the type definitions yet
      icons.definitions += iconToString(icon);
      accu[name] = tag;
    }

    return accu;
  }, {});

  return icons;
}

export function materialLoader(toLoad: Array<string>, loaderConfiguration?: IconsLoader): Icons{
  const icons: Icons = {
    prefix: loaderConfiguration.prefix,
    tags: {},
    definitions: ''
  };

  icons.tags = toLoad.reduce<{[key: string]: string}>((accu, entry, index) => {
    if(entry.endsWith(':custom'))
      return accu;

    if(!entry.includes(':'))
      entry += ':action';

    const [rawName, category] = entry.split(':');
    const [name, path] = rawName.includes('@') ? rawName.split('@') : [rawName, rawName];
    const tag = `i${index}`;
    const svgFile = resolve(process.cwd(), `node_modules/material-design-icons/${category}/svg/production/ic_${path.replace(/-/g, '_')}_48px.svg`);

    // Load the file and manipulate it
    icons.definitions += iconToString(loadSVGIcon(svgFile, tag));
    accu[name] = tag;

    return accu;
  }, {});

  return icons;
}

export interface Icons{
  prefix: string;
  tags: {[key: string]: string};
  definitions: string;
}

export function loadIcons(configuration: Configuration): Icons{
  let icons: Icons = null;

  const toLoad = loadConfigurationEntry<Array<string>>('icons', configuration);
  const rawIconsLoader = loadConfigurationEntry<string | IconsLoader>('iconsLoader', configuration);
  const iconsLoader = typeof rawIconsLoader === 'string' ? {id: rawIconsLoader} : rawIconsLoader;

  switch(iconsLoader.id.toLowerCase()){
    case 'fontawesome':
      icons = fontAwesomeLoader(toLoad, iconsLoader);
      break;
    case 'material':
      icons = materialLoader(toLoad, iconsLoader);
      break;
  }

  if(typeof iconsLoader.afterHook === 'function')
    icons = iconsLoader.afterHook(icons);

  return icons;
}
