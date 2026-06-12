let currentPage = 'index'

export function navigateCurrent() {
  navigate(currentPage)
}

async function reExecuteScripts(container) {
  for (const old of container.querySelectorAll('script')) {
    const fresh = document.createElement('script')
    if (old.src) fresh.src = old.src
    else fresh.textContent = old.textContent
    fresh.type = old.type || 'module'
    old.replaceWith(fresh)
    // Only await external module scripts — inline modules never fire 'load'
    if (fresh.type === 'module' && fresh.src) {
      await new Promise(resolve => {
        fresh.addEventListener('load', resolve, { once: true })
        fresh.addEventListener('error', resolve, { once: true })
      })
    }
  }
}

export async function navigate(page) {
  currentPage = page
  const content = document.getElementById('content')

  const res = await fetch(`/pages/${page}.html`)
  if (!res.ok) {
    content.innerHTML = `<p class="pg-error">Page not found: ${page}</p>`
    return
  }

  content.innerHTML = await res.text()
  await reExecuteScripts(content)

  document.querySelectorAll('#sidebar-nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.page === page)
  )

  document.getElementById('content').focus()
  history.replaceState(null, '', `#${page}`)
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sidebar-nav').addEventListener('click', e => {
    const link = e.target.closest('a[data-page]')
    if (!link) return
    e.preventDefault()
    navigate(link.dataset.page)
  })

  window.addEventListener('hashchange', () => {
    navigate(location.hash.slice(1) || 'index')
  })

  navigate(location.hash.slice(1) || 'index')
})
