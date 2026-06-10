import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import contentService from "@/services/contentService";

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentService.getBlogPosts().then(res => {
      if (res.success) setPosts(res.posts);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <h1 className="text-3xl font-bold mb-8">Blog</h1>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground">No posts yet. Check back soon.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {posts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="hover:shadow-md transition-shadow border rounded-2xl overflow-hidden h-full">
                    {post.cover_image_url && (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <CardContent className="p-4 space-y-2">
                      {post.category && (
                        <span className="text-xs text-primary font-medium uppercase tracking-wide">
                          {post.category}
                        </span>
                      )}
                      <h2 className="font-semibold text-lg leading-tight">{post.title}</h2>
                      {post.author && (
                        <p className="text-xs text-muted-foreground">By {post.author}</p>
                      )}
                      {post.published_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.published_at).toLocaleDateString('en-KE', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
