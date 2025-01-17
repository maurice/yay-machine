<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{{ title }} - yay-machine</title>
    <!-- todo extract this from metadata -->
    <meta name="description" content="yay-machine" />
    <link rel="icon" href="{{ assetsPath }}/icon.png" />
    <link href="{{ assetsPath }}/styles.css" rel="stylesheet" />
    <link href="{{ assetsPath }}/highlight_js/rose-pine-dawn.css" rel="stylesheet" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet" />
    <script type="module">
      import { initSprinkles } from "{{ assetsPath }}/sprinkles.js";
      initSprinkles("{{ assetsPath }}");
    </script>
  </head>
  <body>
    <header>
      <a href="https://yay-machine.js.org/"><img src="{{ assetsPath }}/yay-machine.png" alt="Logo" width="300px"></a>
      <aside>
        <a href="https://github.com/maurice/yay-machine" title="GitHub"><img src="{{ assetsPath }}/github-logo.svg" class="icon-link"/></a>
        <a href="https://www.npmjs.com/package/yay-machine" title="NPM"><img src="{{ assetsPath }}/package.svg" class="icon-link"/></a>
        <button class="nav-button open-nav"><img src="{{ assetsPath }}/list.svg" class="nav-link icon"/></button>
        <button class="nav-button close-nav"><img src="{{ assetsPath }}/x.svg" class="nav-link icon"/></button>
      </aside>
    </header>
    <section>
      <nav class="wide">
        <div class="nav-spacer"></div>
        <div class="menu">
          {{ pageNav }}
        </div>
      </nav>
      <div class="body-content">
        <article>
          {{ html }}
        </article>
      </div>
      <nav class="not-wide">
        <div class="menu">
          {{ pageNav }}
        </div>
      </nav>
    </section>
  </body>
</html>
