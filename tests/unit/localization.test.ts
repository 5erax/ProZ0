import {gameUiMessages} from '../../src/client/localization/GameUiMessages';
import {presentationMessages} from '../../src/client/localization/PresentationMessages';
import {afterEach,expect,it} from 'vitest';
import {assertDictionaryParity,formatNumber,message,setLocale} from '../../src/client/localization/Locale';
import {coreMessages} from '../../src/client/localization/CoreMessages';
import {lobbyMessages} from '../../src/client/localization/LobbyMessages';
import {uiMessages,uiPhrase} from '../../src/client/localization/UiMessages';
import {contentText} from '../../src/client/localization/ContentText';
import {statusMessages} from '../../src/client/localization/StatusMessages';
import {resourceMessages} from '../../src/client/localization/ResourceFacts';
import {inspectItem} from '../../src/client/presentation/ItemInspection';
import { industryText } from '../../src/client/localization/IndustryMessages';
import { lobbyText } from '../../src/client/localization/LobbyMessages';
import {createPhase1ContentCatalog} from '../../src/content';
afterEach(()=>setLocale('en'));
it('both dictionaries retain identical keys and parameters and fail safely to English',()=>{
  for(const dictionary of [coreMessages,lobbyMessages,uiMessages,statusMessages,resourceMessages,presentationMessages,gameUiMessages])assertDictionaryParity(dictionary);
  const dictionary={en:{hello:'Hello {name}'},vi:{}};setLocale('vi');
  expect(message(dictionary,'hello',{name:'<script>&chat'})).toBe('Hello <script>&chat');
  expect(message(dictionary,'missing',{},'Readable fallback')).toBe('Readable fallback');
  expect(message(dictionary,'raw.secret.key')).toBe('');
  expect(()=>assertDictionaryParity(dictionary)).toThrow();
});
it('locale presentation retains canonical identities/fingerprint and formats numbers with Intl',()=>{
  const catalog=createPhase1ContentCatalog(),before=catalog.compatibility.canonicalFingerprint,definition=catalog.get('item:clean-water');
  setLocale('vi');const vi=contentText(definition);expect(vi.displayName).toBe('Nước sạch');expect(vi.displayNameKey).toBe('content.item:clean-water.displayName');expect(uiPhrase('Field Hoe')).toBe('Cuốc dã ngoại');
  expect(formatNumber(1234.5)).toBe('1.234,5');setLocale('en');expect(contentText(definition).displayName).toBe('Clean Water');expect(catalog.get(definition.id)).toBe(definition);expect(catalog.compatibility.canonicalFingerprint).toBe(before);
  const en=inspectItem(catalog,definition.id);setLocale('vi');const localized=inspectItem(catalog,definition.id);expect(localized).not.toBe(en);expect(localized.facts).not.toEqual(en.facts);expect(uiPhrase('OUT_OF_RANGE')).toBe('Đến gần đối tượng hơn');
});

it('translates clear and cold-rain weather labels at authored UI boundaries',()=>{setLocale('vi');expect(uiPhrase('CLEAR')).toBe('Trời quang');expect(uiPhrase('COLD RAIN')).toBe('Mưa lạnh');expect(uiPhrase('COLD RAIN · FORECAST')).toBe('Dự báo mưa lạnh');});

it('translates tester-reported labels without exposing internal state codes or borrowed skin labels', () => {
  setLocale('vi');
  expect(uiPhrase('INVALID')).toBe('Vị trí chưa hợp lệ');
  expect(uiPhrase('Kit')).toBe('Bộ lắp');
  expect(uiPhrase('MIST RAIN')).toBe('Mưa sương');
  expect(uiPhrase('BASE')).toBe('Căn cứ');
  expect(uiPhrase('DETAIL')).toBe('Chi tiết');
  expect(uiPhrase('FAR')).toBe('Xa');
  expect(industryText('expanded storage')).toBe('Kho mở rộng');
  expect(industryText('cultivation')).toBe('Canh tác');
  expect(lobbyText('chooseSkin')).toBe('Chọn trang phục');
});
