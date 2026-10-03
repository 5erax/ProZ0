import { message, type MessageDictionary } from './Locale';
import { uiMessageKey, uiMessages } from './UiMessages';
const names = new WeakMap<object, MessageDictionary>();
/** Presentation metadata only: canonical catalog/save objects remain untouched. */
export function contentText(definition: {readonly id:string; readonly displayName:string}, description='') {
  const displayNameKey = 'content.'+definition.id+'.displayName';
  const descriptionKey = 'content.'+definition.id+'.description';
  const dictionary = {
    en:{[displayNameKey]:definition.displayName,[descriptionKey]:description},
    vi:{[displayNameKey]:uiMessages.vi[uiMessageKey(definition.displayName)]??definition.displayName,[descriptionKey]:uiMessages.vi[uiMessageKey(description)]??description},
  };
  return {displayNameKey,descriptionKey,displayName:message(dictionary,displayNameKey),description:message(dictionary,descriptionKey)};
}
export function contentDisplayName(definition:{readonly id:string; readonly displayName:string}):string {
  let dictionary=names.get(definition);
  if(!dictionary){const key='content.'+definition.id+'.displayName';dictionary={en:{[key]:definition.displayName},vi:{[key]:uiMessages.vi[uiMessageKey(definition.displayName)]??definition.displayName}};names.set(definition,dictionary);}
  return message(dictionary,'content.'+definition.id+'.displayName');
}
