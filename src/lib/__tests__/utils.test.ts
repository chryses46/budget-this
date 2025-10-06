import { cn } from '../utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2')
    })

    it('should handle arrays of classes', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3')
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
    })

    it('should handle undefined and null values', () => {
      expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2')
    })

    it('should merge conflicting Tailwind classes', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })

    it('should handle complex class combinations', () => {
      expect(cn(
        'base-class',
        { 'conditional-class': true },
        ['array-class1', 'array-class2'],
        'px-2 py-1',
        'px-4 py-2'
      )).toBe('base-class conditional-class array-class1 array-class2 px-4 py-2')
    })
  })
})
