import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier) && context.parentURL?.endsWith('.ts')) return next(specifier + '.ts', context)
    return next(specifier, context)
  },
})
