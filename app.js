(() => {
  'use strict';
  const page = document.body.dataset.page;
  if (page === 'home' || !window.PORTFOLIO_DATA) return;
  const items = (window.PORTFOLIO_DATA[page] || []).filter(item => page !== 'graphics' || !item.placeholder);
  const grid = document.querySelector('.collection-grid');
  const query = document.querySelector('#work-search');
  const filters = [...document.querySelectorAll('.filters button')];
  const dialog = document.querySelector('#work-dialog');
  let filter = '全部', opener;
  const make = (tag, className, text) => { const element = document.createElement(tag); if(className) element.className = className; if(text != null) element.textContent = text; return element; };
  function showWork(item, button) {
    opener = button;
    dialog.querySelector('h2').textContent = item.title;
    const image = dialog.querySelector('img'); image.src = item.asset; image.alt = item.title;
    dialog.querySelector('.dialog-info>span').textContent = item.kind.toUpperCase();
    dialog.querySelector('.dialog-info>p').textContent = `素材来自原作品集第 ${item.sourceSlide} 页。标题按画面内容整理。项目背景、个人职责与制作过程可在此补充。`;
    dialog.showModal();
  }
  const graphicGroups = [
    { slide: 7, number: '01', title: '蓝色秩序', english: 'BRAND & COMMUNICATION', description: '从主题海报到产品长图，以统一的视觉语言连接品牌与信息。', ids: ['graphics-04', 'graphics-05', 'graphics-06', 'graphics-07'] },
    { slide: 8, number: '02', title: '热烈发生', english: 'EVENT & KEY VISUAL', description: '让色彩成为情绪的起点，让每一次相聚拥有鲜明的记忆。', ids: ['graphics-08', 'graphics-09', 'graphics-10', 'graphics-11'] },
    { slide: 9, number: '03', title: '信息的形状', english: 'INFORMATION & LAYOUT', description: '梳理复杂内容，在清晰的层次中，找到信息与视觉的平衡。', ids: ['graphics-12', 'graphics-13', 'graphics-14', 'graphics-15', 'graphics-16'] }
  ];
  function renderGraphics(visible) {
    graphicGroups.forEach(group => {
      const groupItems = group.ids.map(id => visible.find(item => item.id === id)).filter(Boolean);
      if (!groupItems.length) return;
      const section = make('section', `graphic-story story-${group.slide}`);
      section.setAttribute('aria-labelledby', `story-heading-${group.slide}`);
      const heading = make('div', 'story-heading');
      const titleBlock = make('div');
      titleBlock.append(make('p', 'eyebrow', `${group.number} / ${group.english}`));
      const title = make('h2', '', group.title);
      title.id = `story-heading-${group.slide}`;
      titleBlock.append(title);
      heading.append(titleBlock, make('p', 'story-description', group.description));
      const composition = make('div', `graphic-composition${groupItems.length < group.ids.length ? ' is-filtered' : ''}`);
      groupItems.forEach(item => {
        const button = make('button', 'graphic-piece');
        button.type = 'button';
        button.dataset.work = item.id;
        button.setAttribute('aria-label', `查看：${item.title}`);
        button.setAttribute('aria-haspopup', 'dialog');
        const image = make('img');
        image.src = item.asset;
        image.alt = item.title;
        image.loading = 'eager';
        image.decoding = 'async';
        const caption = make('span', 'piece-caption');
        caption.append(make('span', '', item.title), make('span', 'piece-open', '↗'));
        button.append(image, caption);
        button.addEventListener('click', () => showWork(item, button));
        composition.append(button);
      });
      section.append(heading, composition);
      grid.append(section);
    });
  }
  function render() {
    const term = query.value.trim().toLocaleLowerCase();
    const visible = items.filter(item => (filter === '全部' || item.kind === filter) && (!term || `${item.title} ${item.kind}`.toLocaleLowerCase().includes(term)));
    grid.replaceChildren();
    if (page === 'graphics') renderGraphics(visible);
    else visible.forEach(item => {
      const card = make(item.placeholder ? 'article' : 'button', `work-card${item.placeholder ? ' empty-slot' : ''}`);
      if(!item.placeholder){card.type='button';card.setAttribute('aria-label',`查看：${item.title}`);card.addEventListener('click',()=>showWork(item,card));}
      const art = make('div','work-art');
      art.append(make('span','work-number mono',String(items.indexOf(item)+1).padStart(2,'0')));
      if(item.placeholder) { art.append(make('span','empty-symbol','+'),make('span','','FUTURE WORK')); }
      else {const img=make('img');img.src=item.asset;img.alt=item.title;img.loading='eager';art.append(img,make('span','work-open','↗'));}
      const info=make('div','work-info');info.append(make('h3','',item.title),make('span','',item.kind));
      card.append(art,info,make('p','',item.placeholder?'预留展示位 · 待补充作品':`作品集 / P.${String(item.sourceSlide).padStart(2,'0')} · ${item.caption || '视觉素材'}`));grid.append(card);
    });
    if(!visible.length) grid.append(make('p','no-results','没有找到匹配作品，请尝试其他关键词。'));
    document.querySelector('#result-count').textContent = `${String(visible.length).padStart(2,'0')} / ${items.length} ${page === 'graphics' ? '件作品' : '展示位'}`;
  }
  filters.forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;filters.forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});render();}));
  query.addEventListener('input',render);
  dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>opener?.focus());
  render();
})();
