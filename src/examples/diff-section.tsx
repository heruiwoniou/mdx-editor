import React from 'react'
import { diffSectionPlugin } from '../plugins/diff-section'
import { MDXEditor } from '../MDXEditor'

const markdown = `
Lexical is an extensible :diffsection[JavaScript]{diff="javascript"} web text-editor framework with an emphasis on reliability, accessibility, and performance.
Lexical aims to provide a best-in-class developer experience, so you can easily prototype and build features with confidence. 
Combined with a highly extensible architecture, :diffsection[Lexical]{diff="Editor"} allows developers to create unique text editing experiences that scale in size and functionality.
`

export const Example = () => {
  return <MDXEditor markdown={markdown} plugins={[diffSectionPlugin()]} />
}
