<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <span class="not-found-content__code">404</span>
      <h1 class="not-found-content__title">Página não encontrada</h1>
      <p class="not-found-content__desc">A página que você procura não existe ou foi removida.</p>
      <router-link to="/" class="not-found-content__link"> Voltar ao Dashboard </router-link>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}

.not-found-content {
  text-align: center;
}

.not-found-content__code {
  font-size: 72px;
  font-weight: 700;
  color: var(--color-primary-600, #2563eb);
  display: block;
}

.not-found-content__title {
  margin: 8px 0 12px;
  font-size: 24px;
  color: var(--color-text, #0f172a);
}

.not-found-content__desc {
  margin: 0 0 24px;
  font-size: 15px;
  color: var(--color-text-muted, #94a3b8);
}

.not-found-content__link {
  display: inline-block;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  background: var(--color-primary-600, #2563eb);
  border-radius: 8px;
  text-decoration: none;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
</style>
