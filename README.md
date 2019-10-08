# vue-next [![CircleCI](https://circleci.com/gh/vuejs/vue-next.svg?style=svg&circle-token=fb883a2d0a73df46e80b2e79fd430959d8f2b488)](https://circleci.com/gh/vuejs/vue-next)

## Status: Pre-Alpha.

We have achieved most of the architectural goals and new features planned for v3:

- Compiler 编译器
  - [x] Modular architecture 使用模块化架构
  - [x] "Block tree" optimization 优化 “Block tree”
  - [x] More aggressive static tree hoisting 更激进的 static tree hoisting 功能
  - [x] Source map support 支持 Source map
  - [x] Built-in identifier prefixing (aka "stripWith") 内置标识符前缀（又名 “stripWith”）
  - [x] Built-in pretty-printing 内置整齐打印（pretty-printing）功能
  - [x] Lean ~10kb brotli-compressed browser build after dropping source map and identifier prefixing 移除 source map 和标识符前缀功能后，使用 Brotli 压缩的浏览器版本精简了大约 10KB

- Runtime 运行时
  - [x] Significantly faster 速度显著提升
  - [x] Simultaneous Composition API + Options API support, **with typings** 同时支持 Composition API 和 Options API，以及 typings
  - [x] Proxy-based change detection 基于 Proxy 实现的数据变更检测
  - [x] Fragments 支持 Fragments
  - [x] Portals 支持 Portals
  - [x] Suspense w/ `async setup()` 支持 Suspense w/ async setup()

However, there are still some 2.x parity features not completed yet:
2.x 功能迁移
- [ ] Server-side rendering 服务器端渲染
- [ ] `<keep-alive>`
- [ ] `<transition>`
- [ ] Compiler DOM-specific transforms
  - [ ] `v-on` DOM modifiers 修饰符
  - [ ] `v-model`
  - [ ] `v-text`
  - [ ] `v-pre`
  - [ ] `v-once`
  - [ ] `v-html`
  - [ ] `v-show`

The current implementation also requires native ES2015+ in the runtime environment and does not support IE11 (yet).

## Contribution

See [Contributing Guide](https://github.com/vuejs/vue-next/blob/master/.github/contributing.md).

## 项目结构
- reactivity 数据响应系统
- runtime-core 与平台无关的运行时。其实现的功能有虚拟 DOM 渲染器、Vue 组件和 Vue 的各种API，我们可以利用这个 runtime 实现针对某个具体平台的高阶 runtime，比如自定义渲染器
- runtime-dom 针对浏览器的 runtime。其功能包括处理原生 DOM API、DOM 事件和 DOM 属性等
- runtime-test 一个专门为了测试而写的轻量级 runtime。由于这个 rumtime 「渲染」出的 DOM 树其实是一个 JS 对象，所以这个 runtime 可以用在所有 JS 环境里。你可以用它来测试渲染是否正确。它还可以用于序列化 DOM、触发 DOM 事件，以及记录某次更新中的 DOM 操作。
- server-renderer 用于 SSR，尚未实现
- compiler-core 平台无关的编译器，它既包含可扩展的基础功能，也包含所有平台无关的插件
- complier-dom 针对浏览器的编译器。
- shared 没有暴露任何 API，主要包含了一些平台无关的内部帮助方法
- vue  用于构建「完整」版本，引用了上面提到的 runtime 和 compiler目录
- template-explorer
