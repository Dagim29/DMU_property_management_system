import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Star,
  MessageSquare,
  Lightbulb,
  Plus,
  ThumbsUp,
  Filter,
} from "lucide-react";
import axios from "axios";

const FeedbackDashboard = () => {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("ratings");
  const [ratings, setRatings] = useState([]);
  const [assetFeedback, setAssetFeedback] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (activeTab === "ratings") {
        const response = await axios.get("http://localhost:8000/api/owner/feedback/service-ratings/", { headers });
        setRatings(response.data);
      } else if (activeTab === "asset-feedback") {
        const url = statusFilter
          ? `http://localhost:8000/api/owner/feedback/asset-feedback-list/?status=${statusFilter}`
          : "http://localhost:8000/api/owner/feedback/asset-feedback-list/";
        const response = await axios.get(url, { headers });
        setAssetFeedback(response.data);
      } else if (activeTab === "suggestions") {
        const response = await axios.get(
          "http://localhost:8000/api/owner/feedback/portal-suggestions/?my_suggestions=true",
          { headers }
        );
        setSuggestions(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (suggestionId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `http://localhost:8000/api/owner/feedback/${suggestionId}/vote/`,
        {},
        { headers }
      );
      // Update local state
      setSuggestions(
        suggestions.map((s) =>
          s.id === suggestionId
            ? { ...s, votes: response.data.votes, user_voted: response.data.user_voted }
            : s
        )
      );
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  const StarDisplay = ({ rating }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const RatingsTab = () => (
    <div className="space-y-4">
      {ratings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Star className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No service ratings yet</p>
        </div>
      ) : (
        ratings.map((rating) => (
          <div key={rating.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600">
                  Request: {rating.maintenance_request_id}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(rating.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Overall Rating
                </p>
                <StarDisplay rating={rating.overall_rating} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Timeliness</p>
                <StarDisplay rating={rating.timeliness_rating} />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Quality</p>
                <StarDisplay rating={rating.quality_rating} />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Communication</p>
                <StarDisplay rating={rating.communication_rating} />
              </div>
            </div>

            {rating.feedback_text && (
              <div className="mb-4">
                <p className="text-sm text-gray-700">{rating.feedback_text}</p>
              </div>
            )}

            {rating.response_text && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900 mb-1">
                  Response from Management
                </p>
                <p className="text-sm text-blue-800">{rating.response_text}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {new Date(rating.responded_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const AssetFeedbackTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {assetFeedback.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No asset feedback yet</p>
        </div>
      ) : (
        assetFeedback.map((feedback) => (
          <div key={feedback.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-medium text-gray-900">
                  {feedback.asset_id} - {feedback.asset_name}
                </p>
                <p className="text-sm text-gray-600">
                  {feedback.feedback_type_display}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(feedback.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  feedback.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-800"
                    : feedback.status === "REVIEWED"
                    ? "bg-blue-100 text-blue-800"
                    : feedback.status === "RESOLVED"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {feedback.status_display}
              </span>
            </div>

            <p className="text-sm text-gray-700 mb-4">{feedback.description}</p>

            {feedback.photos && feedback.photos.length > 0 && (
              <div className="flex gap-2 mb-4">
                {feedback.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Feedback ${index + 1}`}
                    className="w-20 h-20 object-cover rounded"
                  />
                ))}
              </div>
            )}

            {feedback.response_text && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900 mb-1">
                  Response
                </p>
                <p className="text-sm text-blue-800">{feedback.response_text}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const SuggestionsTab = () => (
    <div className="space-y-4">
      {suggestions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No suggestions yet</p>
        </div>
      ) : (
        suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  {suggestion.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {suggestion.category_display}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {suggestion.priority_display}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      suggestion.status === "SUBMITTED"
                        ? "bg-yellow-100 text-yellow-800"
                        : suggestion.status === "UNDER_REVIEW"
                        ? "bg-blue-100 text-blue-800"
                        : suggestion.status === "PLANNED"
                        ? "bg-purple-100 text-purple-800"
                        : suggestion.status === "IMPLEMENTED"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {suggestion.status_display}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleVote(suggestion.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg ${
                  suggestion.user_voted
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm font-medium">{suggestion.votes}</span>
              </button>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              {suggestion.description}
            </p>

            <p className="text-xs text-gray-500">
              {new Date(suggestion.created_at).toLocaleDateString()}
            </p>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feedback & Ratings</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/dashboard/owner/feedback/asset-feedback")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Asset Feedback
          </button>
          <button
            onClick={() => navigate("/dashboard/owner/feedback/suggestion")}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Suggestion
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("ratings")}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === "ratings"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Star className="w-5 h-5 inline mr-2" />
            Service Ratings
          </button>
          <button
            onClick={() => setActiveTab("asset-feedback")}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === "asset-feedback"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <MessageSquare className="w-5 h-5 inline mr-2" />
            Asset Feedback
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === "suggestions"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Lightbulb className="w-5 h-5 inline mr-2" />
            Portal Suggestions
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === "ratings" && <RatingsTab />}
          {activeTab === "asset-feedback" && <AssetFeedbackTab />}
          {activeTab === "suggestions" && <SuggestionsTab />}
        </>
      )}
    </div>
  );
};

export default FeedbackDashboard;
