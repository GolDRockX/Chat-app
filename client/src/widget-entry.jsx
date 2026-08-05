import { createRoot } from 'react-dom/client';
import Widget from './Widget.jsx';

console.log('Widget script loaded');


const currentScript = document.currentScript ||
  Array.from(document.getElementsByTagName('script')).find(s => s.src.includes('widget.js'));

const room = currentScript?.getAttribute('data-room') || 'widget-support';

const container = document.createElement('div');
container.id = 'chat-widget-root';
document.body.appendChild(container);

createRoot(container).render(<Widget room={room} />);