console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


// const navLinks = $$("nav a");

// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname,
//   );

// if (currentLink) {
//     currentLink.classList.add('current');
// }


let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects'},
  { url: 'contact/', title: 'Contact'},
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/subika-haider/', title: 'GitHub'},
];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "/"          
    : "/portfolio/"; 

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    url = !url.startsWith('http') ? BASE_PATH + url : url;
  
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);

    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname
    );
    
    if (a.host !== location.host) {
        a.target = "_blank";
    }
    
    nav.append(a);

}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme:
          <select>
              <option value="light dark">Automatic</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
          </select>
      </label>`,
);
  
const select = document.querySelector('.color-scheme select');

if ("colorScheme" in localStorage) {
    const saved = localStorage.colorScheme;
    document.documentElement.style.setProperty('color-scheme', saved);
    select.value = saved;
  }

select.addEventListener('input', event => {
    const theme = event.target.value;
    document.documentElement.style.setProperty('color-scheme', theme);
    localStorage.colorScheme = theme;
});

const form = document.querySelector('form');

form?.addEventListener('submit', event => {
    event.preventDefault(); 
  
    const data = new FormData(form);
    const params = [];
  
    for (let [name, value] of data) {
      params.push(`${name}=${encodeURIComponent(value)}`);
    }
  
    const url = `${form.action}?${params.join('&')}`;
  
    location.href = url; 
});
