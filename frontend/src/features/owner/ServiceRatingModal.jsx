import React, { useState } from "react";
import { useSelector } from "react-redux";
import { X, Star } from "lucide-react";
import axios from "axios";

const ServiceRatingModal = ({ maintenanceRequest, onClose, onSubmit }) => {
  const { token } = useSelector((state) => state.auth);
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    timeliness_rating: 0,
    quality_rating: 0,
    communication_rating: 0,
  });
  const [feedbackText, setFeedbackText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [hoveredRating, setHoveredRating] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const ratingAspects = [
    { key: "overall_rating", label: "Overall Experience" },
    { key: "timeliness_rating", label: "Timeliness" },
    { key: "quality_rating", label: "Quality of Work" },
    { key: "communication_rating", label: "Communication" },
  ];

  const handleRatingClick = (aspect, value) => {
    setRatings({ ...ratings, [aspect]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate all ratings are provided
    const allRated = Object.values(ratings).every((r) => r > 0);
    if (!allRated) {
      setError("Please provide ratings for all aspects");
      return;
    }

    setSubmitting(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        "http://localhost:8000/api/owner/feedback/service-rating/",
        {
          maintenance_request: maintenanceRequest.id,
          ...ratings,
          feedback_text: feedbackText,
          is_anonymous: isAnonymous,
        },
        { headers }
      );

      onSubmit(response.data);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.maintenance_request?.[0] ||
          "Failed to submit rating"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ aspect, label }) => {
    const currentRating = ratings[aspect];
    const hovered = hoveredRating[aspect] || 0;

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleRatingClick(aspect, value)}
              onMouseEnter={() =>
                setHoveredRating({ ...hoveredRating, [aspect]: value })
              }
              onMouseLeave={() =>
                setHoveredRating({ ...hoveredRating, [aspect]: 0 })
              }
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 ${
                  value <= (hovered || currentRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {currentRating > 0 ? `${currentRating}/5` : "Not rated"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Rate Maintenance Service
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Request ID: <span className="font-medium">{maintenanceRequest.request_id}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Asset: <span className="font-medium">{maintenanceRequest.asset?.name}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {ratingAspects.map((aspect) => (
            <StarRating
              key={aspect.key}
              aspect={aspect.key}
              label={aspect.label}
            />
          ))}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Feedback (Optional)
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your experience with this maintenance service..."
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Submit anonymously
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceRatingModal;
