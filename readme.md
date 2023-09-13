<h1 align="center">Code Runner</h1>

<br>
## Open source GPT-powered REPL

Code Runner is a LLM-powered REPL that runs on your machine, allowing the
language model to run code directly on your computer.

Code Runner is designed to be easily hackable. A lot of the code is a bit hacky
right now, but splicing in new features should be pretty straight forward. Have
fun hacking!

!IMPORTANT: There are inherent risks with running AI generated code directly on
your machine -- Code Runner will ask for approval before running code, and if
there's something wrong with code it produces you can prompt it to regenerate.
Code editing in editor coming soon!

The stubs are in place to support local models with Ollama, and that will be
enabled soon.

<br>

# Get Started

Pull down the repo

```shell
git clone ...
```

Create a `.env` file inside runner-server

```
OPENAI_API_KEY=sk-YOUR_API_KEY_HERE
```

Setup frontend

```
cd runner-frontend
npm i
npm run dev
```

Setup server

```
cd runner-server
npm i
npm run dev
```

Navigate to [http://localhost:5173/](http://localhost:5173/)

<br>

## Prior Art

The excellent
[Open Interpreter](https://raw.githubusercontent.com/KillianLucas/open-interpreter)
<br> While I had started putting the pieces of Code Runner together months ago,
the excellent implementation here inspired me to finish getting it out the door.

[Typescript Notebook](https://github.com/DonJayamanne/typescript-notebook)
