import './index.css'

function revealPage() {
  document.documentElement.style.transition = 'opacity 0.3s ease';
  document.documentElement.style.visibility = 'visible';
  document.documentElement.style.opacity = '1';
}

document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.reveal').forEach((el) => {
    const rect = el.getBoundingClientRect()
    const inView = rect.top < window.innerHeight && rect.bottom > 0
    if (inView) {
      el.classList.add('visible')
    } else {
      observer.observe(el)
    }
  })

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(revealPage)
  } else {
    revealPage()
  }

  const progressObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate')
        progressObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.3 })

  const progressBar = document.getElementById('progress-fill')
  if (progressBar) progressObserver.observe(progressBar)

  const impactObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateImpactRings()
        impactObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.3 })

  const impactSection = document.getElementById('our-impact')
  if (impactSection) impactObserver.observe(impactSection)

  function animateImpactRings() {
    const rings = [
      { ring: document.getElementById('ring-1'), num: document.getElementById('num-1'), glow: document.getElementById('glow-1'), target: 95 },
      { ring: document.getElementById('ring-2'), num: document.getElementById('num-2'), glow: document.getElementById('glow-2'), target: 40 },
      { ring: document.getElementById('ring-3'), num: document.getElementById('num-3'), glow: document.getElementById('glow-3'), target: 100 },
    ]

    rings.forEach((item, index) => {
      setTimeout(() => {
        if (item.ring) {
          const circumference = 326.7
          const offset = circumference * (1 - item.target / 100)
          item.ring.style.strokeDashoffset = offset
        }
        if (item.num) {
          animateCounter(item.num, item.target)
        }
      }, index * 200)
    })

    setTimeout(() => {
      rings.forEach((item) => {
        if (item.glow) {
          item.glow.style.opacity = '1'
          item.glow.classList.add('impact-glow')
        }
      })
    }, rings.length * 200 + 1800)
  }

  function animateCounter(el, target) {
    let current = 0
    const increment = target / (1500 / 16)
    const interval = setInterval(() => {
      current += increment
      if (current >= target) {
        current = target
        clearInterval(interval)
      }
      el.textContent = Math.round(current)
    }, 16)
  }

  document.querySelectorAll('.team-social-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const card = btn.closest('.team-card')
      if (card) card.classList.toggle('is-active')
    })
  })
})
