## Error Type
Recoverable Error

## Error Message
Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <RedirectBoundary>
      <RedirectErrorBoundary router={{...}}>
        <Head>
        <__next_root_layout_boundary__>
          <SegmentViewNode type="layout" pagePath="/Z4rum/fro...">
            <SegmentTrieNode>
            <link>
            <script>
            <script>
            <script>
            <RootLayout>
              <html lang="en">
                <body className="geist_a715...">
                  <Providers>
                    <ToastProvider>
                      <div className="min-h-scre...">
                        <div className="max-w-[140...">
                          <div className="hidden md:...">
                            <Sidebar>
                              <aside className="w-72 min-w...">
                                <div>
                                <nav>
                                <div
+                                 className="flex flex-col gap-3"
-                                 className="flex flex-col gap-2"
                                >
+                                 <button
+                                   className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] t..."
+                                 >
-                                 <a
-                                   className="w-full text-center py-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[..."
-                                   href="/login"
-                                 >
                                  ...
                          ...
                        ...
                      ...
        ...



    at button (<anonymous>:null:null)
    at Sidebar (app/_components/Sidebar.tsx:65:11)
    at RootLayout (app/layout.tsx:35:48)

## Code Frame
  63 |       {token ? (
  64 |         <div className="flex flex-col gap-3">
> 65 |           <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-[1.02] transition-all duration-200">
     |           ^
  66 |             Post
  67 |           </button>
  68 |           <button onClick={() => { logout(); router.replace("/login"); }} className="w-full py-2 rounded-xl border border-[#1e3a52] text-[#cbd5e1] hover:bg-[#1e293b] transition-colors">

Next.js version: 16.0.0 (Turbopack)

////////////////////////////////////////////////////


## Error Type
Console Error

## Error Message
Encountered two children with the same key, `5f48ff92-0f01-4541-9e1e-ff5dd37afed3`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at <unknown> (app/home/page.tsx:190:11)
    at Array.map (<anonymous>:null:null)
    at HomePage (app/home/page.tsx:189:16)

## Code Frame
  188 |       <div className="flex flex-col gap-5">
  189 |         {items.map((p) => (
> 190 |           <PostCard key={p.id} post={p} />
      |           ^
  191 |         ))}
  192 |       </div>
  193 |       <div ref={sentinelRef} className="h-10" />

Next.js version: 16.0.0 (Turbopack)

