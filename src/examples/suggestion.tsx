import React from 'react'
import inlineSuggestionPlugin from '../plugins/inline-suggestion'
import { MDXEditor } from '../MDXEditor'
import { headingsPlugin } from '../plugins/headings'

export const Example = () => {
  return (
    <MDXEditor
      markdown="# Hello Suggestion"
      plugins={[
        headingsPlugin(),
        inlineSuggestionPlugin({
          service: (context: string) => {
            // console.log('context', context)
            // return Promise.resolve(['Hello, World'])
            return fetch('https://staging-api.ipnovo.ai/agt/copilot/autocomplete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-copliot-token': '395a1d27d6b8335bfac1' // Hardcoded token - this is temporary and will be abandoned
              },
              body: new URLSearchParams({ suggestion: context }).toString()
            })
              .then((response) => response.json())
              .then((json: { suggestion: string }) => json.suggestion)
          }
        })
      ]}
    />
  )
}
