import './styles/main.css';
import './mechanisms';
import { savedLang, setLang } from './i18n';
import { Shell } from './app/shell';

setLang(savedLang());
new Shell(document.getElementById('app')!);
