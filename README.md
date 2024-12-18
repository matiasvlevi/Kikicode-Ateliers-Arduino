# vault-pages-template

Github Pages presets for hosting static sites with client-side decryption.

<br/>

## How to use?

Encrypt your assets with the following command:

```bash
openssl enc -aes-256-cbc \
    -A -base64 -salt -pbkdf2 -iter 10000 \
    -in example.pdf -out example.pdf.enc \
    -pass pass:YOUR_PASS_KEY
```

Then, upload the encrypted asset to the `docs` folder and update the link in your markdown file.

```markdown
[See document](./docs/example.pdf.enc)
```

<br/>

## Try it out

You can use these sample documents below to test the decryption feature.

| Name | Password | Encrypted PDF |
| ---- | -------- | ------------- |
| `document.pdf` | `pass1234` | [document.pdf.enc](./docs/document.pdf.enc) |
| `example.pdf` | `YOUR_PASS_KEY` | [example.pdf.enc](./docs/example.pdf.enc) |

These sample documents were generated with the [pandoc-template](https://github.com/matiasvlevi/pandoc-template) repository.

<br/>