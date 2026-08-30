import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'

interface ReviewItem {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  customerName: string
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20">
          <path
            d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L1.3 7.7l6.1-.6L10 1.5z"
            fill={i <= Math.round(value) ? 'var(--color-banana)' : 'none'}
            stroke="var(--color-banana)"
            strokeWidth="1.2"
          />
        </svg>
      ))}
    </div>
  )
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          className="p-0.5"
        >
          <svg width="24" height="24" viewBox="0 0 20 20">
            <path
              d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L1.3 7.7l6.1-.6L10 1.5z"
              fill={i <= value ? 'var(--color-banana)' : 'none'}
              stroke="var(--color-banana)"
              strokeWidth="1.2"
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [canReview, setCanReview] = useState(false)
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null)
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isStaffOrOwner = user?.role === 'STAFF' || user?.role === 'OWNER'

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch(`/reviews/product/${productId}`)
      setReviews(data.reviews)
      setAverageRating(data.averageRating)
      setCount(data.count)
    } catch {
      // reviews are supplementary — fail quietly
    } finally {
      setLoading(false)
    }
  }

  async function loadEligibility() {
    if (!user || isStaffOrOwner) return
    try {
      const data = await apiFetch(`/reviews/product/${productId}/eligibility`)
      setCanReview(data.canReview)
      setEligibilityReason(data.reason || null)
    } catch {
      setCanReview(false)
    }
  }

  useEffect(() => {
    load()
    loadEligibility()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (myRating < 1) {
      setError('Please select a star rating.')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch(`/reviews/product/${productId}`, {
        method: 'POST',
        body: JSON.stringify({ rating: myRating, comment: myComment || undefined }),
      })
      setMyRating(0)
      setMyComment('')
      setCanReview(false)
      setEligibilityReason('ALREADY_REVIEWED')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(reviewId: string) {
    if (!confirm('Delete this review?')) return
    try {
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
      await fetch(`${API_URL}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      load()
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-5 pt-5 border-t border-caramel-light/60">
      <div className="flex items-center gap-2 mb-3">
        <p className="font-display font-semibold text-espresso">Reviews</p>
        {count > 0 && (
          <>
            <Stars value={averageRating} />
            <span className="text-sm text-espresso-soft">{averageRating.toFixed(1)} ({count})</span>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-espresso-soft">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-espresso-soft mb-4">No reviews yet.</p>
      ) : (
        <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
          {reviews.map((r) => (
            <div key={r.id} className="bg-cream rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs font-semibold text-espresso">{r.customerName}</span>
                </div>
                {isStaffOrOwner && (
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-espresso-soft/60 hover:text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
              {r.comment && <p className="text-sm text-espresso-soft">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {user && !isStaffOrOwner && canReview && (
        <form onSubmit={handleSubmit} className="bg-cream-deep rounded-xl p-3 space-y-2">
          <p className="text-sm font-semibold text-espresso">Leave a review</p>
          <StarInput value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder="Optional comment"
            rows={2}
            className="w-full border border-caramel-light rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-caramel/40"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-caramel hover:bg-caramel-dark text-white rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}

      {user && !isStaffOrOwner && !canReview && eligibilityReason === 'NOT_PURCHASED' && (
        <p className="text-xs text-espresso-soft/70">Order and receive this product to leave a review.</p>
      )}
    </div>
  )
}

export default ProductReviews