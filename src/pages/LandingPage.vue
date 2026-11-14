<script setup>
import { ref } from 'vue'

const openFaq = ref(null)

const features = [
  {
    title: 'Encrypted before upload',
    body: 'Records are sealed with AES-256-GCM in your browser. The server only ever stores ciphertext.'
  },
  {
    title: 'Two record types',
    body: 'Keep personal details and website logins in separate, clearly labelled sections.'
  },
  {
    title: 'Instant local search',
    body: 'Type one letter and matching titles appear immediately. Nothing about your search leaves the device.'
  },
  {
    title: 'Automatic locking',
    body: 'The vault locks itself after inactivity and drops the key from memory.'
  },
  {
    title: 'Encrypted backups',
    body: 'Export a versioned backup you can restore on another device with your master passphrase.'
  },
  {
    title: 'Works on phones',
    body: 'Built for Android and iPhone first, with large tap targets and a bottom sheet editor.'
  }
]

const faqs = [
  {
    q: 'What is the difference between my account password and the master passphrase?',
    a: 'Your account password or PIN gets you into the account. The master passphrase decrypts the vault. They are separate secrets and neither one replaces the other.'
  },
  {
    q: 'Can the server read my records?',
    a: 'No. Titles, names, IDs, passwords and notes are encrypted in the browser. The database stores ciphertext, an IV and a version number.'
  },
  {
    q: 'What happens if I forget the master passphrase?',
    a: 'The records cannot be decrypted. Account recovery restores access to the account, not the vault contents. Keep an encrypted backup somewhere safe.'
  },
  {
    q: 'Can I use the vault on a second device?',
    a: 'Yes. Sign in, then enter the same master passphrase. The key is derived locally from the passphrase and a per-vault salt.'
  },
  {
    q: 'How long does the vault stay unlocked?',
    a: 'Five minutes of inactivity by default. You can raise or lower that in Settings, or lock it immediately from the header.'
  },
  {
    q: 'Is there a free tier limit?',
    a: 'The app itself has no record limit. Supabase free tier limits apply to the backing database.'
  }
]

function toggle(index) {
  openFaq.value = openFaq.value === index ? null : index
}
</script>

<template>
  <div class="page">
    <section class="hero">
      <div class="wrap">
        <p class="banner">Zero-knowledge by design — your passphrase never leaves the browser</p>
        <h1>Your personal details, sealed in a vault only you can open.</h1>
        <p class="lead dim">
          My Personal Vault stores identity details and website logins as ciphertext. Sign in from any
          device, unlock with your master passphrase, and search everything instantly.
        </p>
        <div class="row hero-actions">
          <RouterLink class="btn btn-primary" to="/create-account">Create Account</RouterLink>
          <RouterLink class="btn" to="/signin">Sign In</RouterLink>
        </div>
        <p class="faint tiny">
          Three sign-in methods, email verification on every account, and encrypted backups you own.
        </p>
      </div>
    </section>

    <section class="wrap section">
      <h2>Built for the way you actually use a vault</h2>
      <div class="grid">
        <div v-for="feature in features" :key="feature.title" class="card">
          <h3>{{ feature.title }}</h3>
          <p class="dim small">{{ feature.body }}</p>
        </div>
      </div>
    </section>

    <section class="wrap section narrow">
      <h2>Questions</h2>
      <div class="faq">
        <div v-for="(item, index) in faqs" :key="item.q" class="faq-item card card-tight">
          <button
            class="faq-q"
            type="button"
            :aria-expanded="openFaq === index"
            :aria-controls="`faq-panel-${index}`"
            @click="toggle(index)"
          >
            <span class="grow">{{ item.q }}</span>
            <span class="faq-sign" aria-hidden="true">{{ openFaq === index ? '−' : '+' }}</span>
          </button>
          <div v-show="openFaq === index" :id="`faq-panel-${index}`" class="faq-a dim">
            {{ item.a }}
          </div>
        </div>
      </div>
    </section>

    <section class="wrap section center">
      <h2>Start in under a minute</h2>
      <p class="dim">Choose a sign-in method, verify your email, then set a master passphrase.</p>
      <RouterLink class="btn btn-primary" to="/create-account">Create Account</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.hero {
  padding: 2.5rem 0 2rem;
  border-bottom: 1px solid var(--line);
  background:
    radial-gradient(circle at 15% -10%, rgba(74, 222, 128, 0.13), transparent 55%),
    radial-gradient(circle at 85% 0%, rgba(56, 189, 248, 0.1), transparent 50%);
}

.banner {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid rgba(74, 222, 128, 0.4);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  margin-bottom: 1rem;
}

.lead {
  max-width: 58ch;
  font-size: 1.02rem;
}

.hero-actions {
  margin-top: 1.2rem;
}

.tiny {
  font-size: 0.78rem;
  margin-top: 0.9rem;
}

.section {
  padding: 2.2rem 0;
}

.section.narrow {
  max-width: 720px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
}

.small {
  font-size: 0.9rem;
  margin: 0;
}

.faq {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.faq-q {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  background: none;
  border: 0;
  color: var(--text);
  font: inherit;
  font-weight: 600;
  text-align: left;
  padding: 0.2rem 0;
  min-height: 32px;
  cursor: pointer;
}

.faq-sign {
  color: var(--accent);
  font-size: 1.2rem;
  line-height: 1;
}

.faq-a {
  padding-top: 0.5rem;
  font-size: 0.9rem;
}

@media (min-width: 680px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero {
    padding: 4rem 0 3rem;
  }
}

@media (min-width: 980px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>