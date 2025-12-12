---
title: 'Stealing Ideas from Rust and C++ for Your C Standard Library'
description: 'Making C less painful by borrowing modern language concepts'
pubDate: 'Dec 12 2025'
slug: extending-c-stdlib
heroImage: 
  src: '/rustc.PNG'
  alt: 'rustc'
order: 2
tags: ["C", "Programming"]
---

*What if we could have nice things in C?*

Ok, most of things cover in this post is already exists in some C library, you can just directly use them

but who gonna stop us implement our own lib right?

## The Problem with Vanilla C

If you've written C for any extended period, you know the pain. No dynamic arrays. No hash maps. No proper string handling. Every time you want to do something that takes one line in Python (it sucks, sry python lover), you're suddenly writing 50 lines of memory management code.

But here's the thing - nothing stops us from building these abstractions ourselves. And we can steal ideas from languages that figured this out decades ago.

I've been exploring how to extend my personal C utility library with concepts from Rust, C++, and Tsoding's [nob.h](https://github.com/tsoding/nob.h).

---

## Dynamic Arrays (The Foundation)

C++ has `std::vector`. Rust has `Vec<T>`. We can have our own.

The idea is dead simple:

```
┌──────────┬─────┬─────┬───────────┐
│ data *   │ len │ cap │ elem_size │
└────┬─────┴─────┴─────┴───────────┘
     │
     ▼
┌────┬────┬────┬────┬────┬────┐
│ e0 │ e1 │ e2 │ .. │    │    │
└────┴────┴────┴────┴────┴────┘
```

```c
typedef struct s_vec
{
    void    *data;
    size_t  len;
    size_t  cap;
    size_t  elem_size;
}   t_vec;

t_vec   *vec_new(size_t elem_size, size_t init_cap);
int     vec_push(t_vec *v, const void *elem);
int     vec_pop(t_vec *v, void *out);
void    *vec_get(t_vec *v, size_t index);
void    vec_free(t_vec *v);
```

Track your data pointer, current length, total capacity, and element size. When `len == cap`, allocate a new buffer with `2x` capacity, copy everything over, free the old one. That's it. O(1) amortized append.

```c
// Usage
t_vec *nums = vec_new(sizeof(int), 8);
int x = 42;
vec_push(nums, &x);
x = 100;
vec_push(nums, &x);

int *ptr = vec_get(nums, 0);  // returns pointer to 42
```

Tsoding's nob.h does this beautifully with macros. You can go the struct route if you prefer type safety over convenience.

---

## String Builder

Building strings character by character in C is miserable. You either pre-allocate way too much, or you're doing `realloc` gymnastics.

A string builder is just a dynamic array specialized for chars:

```c
typedef struct s_str
{
    char    *data;
    size_t  len;
    size_t  cap;
}   t_str;

t_str   *str_new(void);
t_str   *str_from(const char *s);
int     str_push(t_str *s, char c);
int     str_append(t_str *s, const char *suffix);
char    *str_to_cstr(t_str *s);  // get null-terminated result
void    str_free(t_str *s);
```

No more counting string lengths. No more buffer overflow anxiety. Just append stuff and extract the result.

```c
t_str *path = str_new();
str_append(path, "/home/");
str_append(path, username);
str_append(path, "/.config");
char *result = str_to_cstr(path);  // "/home/bob/.config"
```

This is basically what `std::string` gives you in C++, minus the operator overloading.

---

## String View (Zero-Copy Parsing)

This one's from both Rust (`&str`) and nob.h. A string view is just a pointer + length that *references* existing string data without copying.

```c
typedef struct s_sv
{
    const char  *data;
    size_t      len;
}   t_sv;

t_sv    sv_from_cstr(const char *s);
t_sv    sv_chop_by_delim(t_sv *sv, char delim);
t_sv    sv_trim(t_sv sv);
int     sv_eq(t_sv a, t_sv b);
char    *sv_to_cstr(t_sv sv);  // allocate only when needed
```

The magic is in `sv_chop_by_delim` - it returns the part before the delimiter and advances the original view past it:

```c
t_sv line = sv_from_cstr("hello,world,foo");
while (line.len > 0)
{
    t_sv token = sv_chop_by_delim(&line, ',');
    // token is "hello", then "world", then "foo"
    // zero allocations!
}
```

This is incredibly useful for parsing. You can tokenize an entire file without a single malloc.

---

## Result Types (Rust's Best Idea)

Rust's `Result<T, E>` is genuinely one of the best error handling patterns I've seen. Instead of returning `-1` or `NULL` and hoping the caller checks, you return a tagged union that *forces* handling.

```c
typedef struct s_result
{
    int     ok;       // 1 = success, 0 = error
    void    *value;   // the actual data
    char    *error;   // error message if failed
}   t_result;

t_result    result_ok(void *value);
t_result    result_err(char *msg);
int         result_is_ok(t_result res);
void        *result_unwrap(t_result res);
```

Now your functions return `t_result` instead of raw pointers:

```c
t_result parse_config(const char *path)
{
    int fd = open(path, O_RDONLY);
    if (fd < 0)
        return (result_err("failed to open config"));
    // ...parse...
    return (result_ok(config));
}

// Caller
t_result res = parse_config("app.conf");
if (!result_is_ok(res))
{
    printf("Error: %s\n", res.error);
    return (1);
}
t_config *cfg = result_unwrap(res);
```

Is it more verbose? Yeah. Does it prevent entire classes of bugs? Also yeah.

---

## The Defer Pattern

This one's from nob.h and it's surprisingly elegant. The problem: functions with multiple exit points leak resources.

```c
int some_function(void)
{
    int     result;
    char    *buf;
    int     fd;

    result = 0;
    buf = NULL;
    fd = -1;
    
    buf = malloc(100);
    if (!buf)
        return (-1);
    
    fd = open("file", O_RDONLY);
    if (fd < 0)
    {
        result = -1;
        goto defer;  // jump to cleanup
    }
    
    // ... do work ...
    
    result = 1;
defer:
    if (buf)
        free(buf);
    if (fd >= 0)
        close(fd);
    return (result);
}
```

`goto` gets a bad rap, but this is legitimate structured use. All cleanup happens in one place at the bottom. No matter how many error conditions you have, resources get freed.

---

## Hash Maps

Every modern language has a built-in hash map. C doesn't. So we build one.

```c
typedef struct s_hashmap
{
    t_vec   *buckets;  // array of chains
    size_t  size;      // number of entries
    size_t  cap;       // number of buckets
}   t_hashmap;

t_hashmap   *hashmap_new(size_t init_cap);
int         hashmap_set(t_hashmap *m, const char *key, void *value);
void        *hashmap_get(t_hashmap *m, const char *key);
int         hashmap_has(t_hashmap *m, const char *key);
int         hashmap_del(t_hashmap *m, const char *key);
void        hashmap_free(t_hashmap *m, void (*del)(void *));
```

For string keys, djb2 is a solid hash function:

```c
size_t hash(const char *str)
{
    size_t h = 5381;
    while (*str)
        h = ((h << 5) + h) + *str++;
    return (h);
}
```

Use cases are everywhere - config lookups, caching, symbol tables, environment variables.

---

## Double-Ended Queue

A deque lets you push/pop from both ends in O(1). Implemented as a circular buffer:

```
        head              tail
          ↓                 ↓
┌────┬────┬────┬────┬────┬────┬────┬────┐
│    │    │ A  │ B  │ C  │ D  │    │    │
└────┴────┴────┴────┴────┴────┴────┴────┘
```

```c
typedef struct s_deque
{
    int     *data;
    size_t  head;
    size_t  tail;
    size_t  len;
    size_t  cap;
}   t_deque;

t_deque *deque_new(size_t cap);
int     deque_push_front(t_deque *d, int val);
int     deque_push_back(t_deque *d, int val);
int     deque_pop_front(t_deque *d, int *out);
int     deque_pop_back(t_deque *d, int *out);
```

Push front? Decrement head (with wraparound). Push back? Increment tail. Both O(1).

This is perfect for algorithms that need stack + queue behavior, or anything involving sliding windows.

---

## Arena Allocator

This one's a game changer for certain workloads.

Instead of individual `malloc`/`free` calls, you allocate a big chunk upfront. Then you just bump a pointer for each allocation:

```c
typedef struct s_arena
{
    char    *buffer;
    size_t  offset;
    size_t  cap;
}   t_arena;

t_arena *arena_new(size_t size);
void    *arena_alloc(t_arena *a, size_t size);
void    arena_reset(t_arena *a);  // reuse memory
void    arena_free(t_arena *a);   // free everything
```

```c
void *arena_alloc(t_arena *a, size_t size)
{
    void *ptr;
    
    if (a->offset + size > a->cap)
        return (NULL);
    ptr = a->buffer + a->offset;
    a->offset += size;
    return (ptr);
}
```

When you're done with everything, free the whole arena at once. No tracking individual allocations. No memory leaks from forgotten frees.

Rust's bumpalo crate does this. It's incredible for parsers, AST construction, or any "allocate a bunch of stuff, use it, throw it all away" pattern.

---

## Temporary Allocator

Similar to arena, but using a static buffer for truly temporary strings:

```c
#define TEMP_CAP 8192

static char g_temp_buffer[TEMP_CAP];
static size_t g_temp_offset = 0;

void    *temp_alloc(size_t size);
void    temp_reset(void);
char    *temp_sprintf(const char *fmt, ...);
```

Perfect for building paths, formatting strings, or anything you need briefly and then discard:

```c
while (/* main loop */)
{
    temp_reset();  // clear at start of each iteration
    
    char *path = temp_sprintf("/tmp/%s_%d.txt", name, id);
    // use path...
    // no need to free!
}
```

---

## File Utilities

Reading and writing entire files is tedious. Make it one call:

```c
// Returns malloc'd buffer, sets *size. NULL on error.
char    *read_entire_file(const char *path, size_t *size);

// Returns 1 on success, 0 on failure
int     write_entire_file(const char *path, const void *data, size_t size);
```

---

## Path Manipulation

```c
char        *path_join(const char *base, const char *name);
const char  *path_name(const char *path);     // "a/b/file.c" -> "file.c"
char        *path_dir(const char *path);      // "a/b/file.c" -> "a/b"
const char  *path_ext(const char *path);      // "file.c" -> "c"
int         path_exists(const char *path);
```

---

## Logging

```c
typedef enum e_log_level
{
    LOG_DEBUG,
    LOG_INFO,
    LOG_WARN,
    LOG_ERROR
}   t_log_level;

void    log_msg(t_log_level level, const char *fmt, ...);

#define LOG_INFO(fmt, ...) \
    log_internal(LOG_INFO, __FILE__, __LINE__, fmt, ##__VA_ARGS__)
```

Output:
```
[INFO] main.c:42: Starting program
[ERROR] parser.c:128: Unexpected token 'foo'
```

---

## Vector Math

If you're doing anything graphical, you need 2D/3D vector operations:

```c
typedef struct s_vec2
{
    double  x;
    double  y;
}   t_vec2;

t_vec2  vec2_add(t_vec2 a, t_vec2 b);
t_vec2  vec2_sub(t_vec2 a, t_vec2 b);
t_vec2  vec2_scale(t_vec2 v, double s);
double  vec2_dot(t_vec2 a, t_vec2 b);
double  vec2_len(t_vec2 v);
t_vec2  vec2_norm(t_vec2 v);
```

Also complex numbers for fractal rendering:

```c
typedef struct s_complex
{
    double  re;
    double  im;
}   t_complex;

t_complex   complex_add(t_complex a, t_complex b);
t_complex   complex_mul(t_complex a, t_complex b);
double      complex_abs(t_complex z);
```

Mandelbrot becomes trivial:

```c
while (complex_abs(z) < 2.0 && iter < max)
{
    z = complex_add(complex_mul(z, z), c);
    iter++;
}
```

---

## Miscellaneous Utilities

**Generic swap:**
```c
void    swap(void *a, void *b, size_t size);
```

**Argument shifting (nob.h style):**
```c
char    *shift_args(int *argc, char ***argv);

// Usage
char *program = shift_args(&argc, &argv);
char *command = shift_args(&argc, &argv);
```

**O(1) unordered remove from dynamic array:**
```c
// Instead of shifting all elements, swap with last and decrement len
int vec_remove_unordered(t_vec *v, size_t index);
```

**Debug assertions:**
```c
#ifdef DEBUG
# define ASSERT(cond) \
    assert_impl((cond), #cond, __FILE__, __LINE__)
#else
# define ASSERT(cond) ((void)0)
#endif
```

---

## The Point

C gives you nothing, but it also *restricts* nothing. Every feature missing from the standard library is an opportunity to build exactly what you need.

The best part? These patterns compose. Dynamic arrays can hold hash map buckets. String builders can use arena allocators. Result types can wrap any of these.

You don't need a "batteries included" language. You just need to build your own batteries.

