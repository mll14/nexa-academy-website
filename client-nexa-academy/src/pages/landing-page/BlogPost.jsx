import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import contentService from "@/services/contentService";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    contentService.getBlogPost(slug).then(res => {
      if (res.success && res.post) setPost(res.post);
      else setNotFound(true);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
      <Footer />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-semibold">Post not found.</p>
        <Link to="/blog" className="text-primary hover:underline text-sm">← Back to Blog</Link>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 w-full">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground mb-6 block">
            ← Back to Blog
          </Link>
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full rounded-2xl mb-8 object-cover max-h-72"
            />
          )}
          {post.category && (
            <span className="text-xs text-primary font-semibold uppercase tracking-wide">
              {post.category}
            </span>
          )}
          <h1 className="text-3xl font-bold mt-2 mb-2">{post.title}</h1>
          <div className="flex gap-3 text-xs text-muted-foreground mb-8">
            {post.author && <span>By {post.author}</span>}
            {post.published_at && (
              <span>
                {new Date(post.published_at).toLocaleDateString('en-KE', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            )}
          </div>
          <div
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body) }}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
