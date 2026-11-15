// O catálogo de disciplinas: num Moodle com categorias, a lista sem categoria vem vazia e é preciso percorrê-las.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MoodleClient } from '../../src/server/moodle/client.ts';
import { MoodleError } from '../../src/server/moodle/http.ts';

const course = (id: number, title: string) => `<div class="coursebox"><h3 class="coursename"><a href="http://localhost:3211/course/view.php?id=${id}">${title}</a></h3></div>`;
const category = (id: number) => `<a href="http://localhost:3211/course/index.php?categoryid=${id}">Categoria ${id}</a>`;
const page = (body: string) => new Response(`<html><body><div role="main">${body}</div><input type="hidden" name="sesskey" value="abc"></body></html>`, { headers: { 'content-type': 'text/html' } });
const next = (n: number) => `<a rel="next" href="http://localhost:3211/course/index.php?categoryid=1&browse=courses&perpage=100&page=${n}">Próxima</a>`;

/**
 * Um Moodle com categorias: a raiz só lista categorias. Como no Moodle de verdade, a visão padrão de uma categoria traz os
 * links das subcategorias, e a visão "browse=courses" só as disciplinas (e um "ver todas as subcategorias").
 */
function site(requests: string[]) {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input));
    const key = `${url.pathname}${url.search}`;
    requests.push(key);
    if (key.startsWith('/course/index.php?browse=courses')) return page('<p>Nenhuma disciplina nesta categoria.</p>');
    if (key === '/course/index.php') return page(`${category(1)} ${category(2)}`);
    if (key === '/course/index.php?categoryid=1') return page('');
    if (key.startsWith('/course/index.php?categoryid=1&browse=courses&perpage=100&page=0')) return page(`${course(10, 'Redes')}${course(11, 'Banco de dados')}${next(1)}`);
    if (key.startsWith('/course/index.php?categoryid=1&browse=courses&perpage=100&page=1')) return page(course(12, 'Álgebra'));
    // A categoria 2 não tem disciplinas, só subcategorias (e um link de volta para a 1).
    if (key === '/course/index.php?categoryid=2') return page(`${category(1)} ${category(3)}`);
    if (key.startsWith('/course/index.php?categoryid=2&browse=courses')) return page('<a href="http://localhost:3211/course/index.php?categoryid=2&browse=categories">Ver todas as subcategorias</a>');
    if (key === '/course/index.php?categoryid=3') return page('');
    if (key.startsWith('/course/index.php?categoryid=3&browse=courses')) return page(`${course(20, 'Python')}${course(10, 'Redes')}`);
    return new Response('não encontrado', { status: 404 });
  };
}

test('num Moodle com categorias, o catálogo percorre categorias e subcategorias, sem repetir, e vem em ordem', async () => {
  const requests: string[] = [];
  const client = new MoodleClient('http://localhost:3211', { fetch: site(requests) });
  const courses = await client.courses();
  assert.deepEqual(courses.map((entry) => [entry.id, entry.title]), [
    [12, 'Álgebra'], [11, 'Banco de dados'], [20, 'Python'], [10, 'Redes'],
  ]);
  // A categoria 1 (com link de volta) é lida uma vez só: a visão padrão e duas páginas de disciplinas (por causa do "Próxima").
  assert.equal(requests.filter((key) => key === '/course/index.php?categoryid=1').length, 1);
  assert.equal(requests.filter((key) => key.startsWith('/course/index.php?categoryid=1&browse=courses')).length, 2);
  assert.equal(requests.filter((key) => key === '/course/index.php?categoryid=3').length, 1);
});

test('com uma categoria só (a lista antiga já traz as disciplinas) não há leitura extra', async () => {
  const requests: string[] = [];
  const client = new MoodleClient('http://localhost:3211', {
    fetch: async (input) => {
      requests.push(`${new URL(String(input)).pathname}${new URL(String(input)).search}`);
      return page(`${course(5, 'Fictitious course')}`);
    },
  });
  assert.deepEqual(await client.courses(), [{ id: 5, title: 'Fictitious course' }]);
  assert.equal(requests.length, 1);
});

test('um link de categoria que sai da instalação é ignorado, e há um limite de categorias', async () => {
  const client = new MoodleClient('http://localhost:3211', {
    fetch: async (input) => {
      const key = `${new URL(String(input)).pathname}${new URL(String(input)).search}`;
      if (key.startsWith('/course/index.php?browse=courses')) return page('');
      if (key === '/course/index.php') return page('<a href="https://outside.invalid/course/index.php?categoryid=9">fora</a>' + category(1));
      if (key === '/course/index.php?categoryid=1') return page('');
      return page(course(7, 'Única'));
    },
  });
  assert.deepEqual((await client.courses()).map((entry) => entry.id), [7]);

  const endless = new MoodleClient('http://localhost:3211', {
    fetch: async (input) => {
      const url = new URL(String(input));
      const id = Number(url.searchParams.get('categoryid') ?? 0);
      if (url.pathname === '/course/index.php' && !url.search) return page(category(1));
      if (url.searchParams.get('browse') === 'courses') return page('');
      // Cada categoria aponta para a próxima, sem fim.
      return page(category(id + 1));
    },
  });
  await assert.rejects(endless.courses(), (error) => error instanceof MoodleError && error.code === 'course_limit');
});
