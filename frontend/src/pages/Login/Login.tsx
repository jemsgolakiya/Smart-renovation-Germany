import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Heading from "../../components/Heading/Heading";
import Text from "../../components/Text/Text";

const LoginPage: React.FC = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const { login } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		if (!username.trim() || !password.trim()) {
			setError("Please enter both username and password");
			setLoading(false);
			return;
		}

		try {
			await login(username, password);
			navigate("/home");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
			<div className="w-full max-w-md">
				<div className="bg-white rounded-lg shadow-lg p-8">
					<div className="text-center mb-8">
						<Heading level={1} className="text-emerald-600 mb-2">
							Login
						</Heading>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
								{error}
							</div>
						)}

						<div>
							<label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
								Username
							</label>
							<input
								type="text"
								id="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
								required
								autoComplete="username"
							/>
						</div>

						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
								Password
							</label>
							<input
								type="password"
								id="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
								required
								autoComplete="current-password"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? "Logging in..." : "Login"}
						</button>
					</form>

					<div className="mt-6 text-center">
						<Text className="text-sm text-gray-600">
							Don't have an account?{" "}
							<Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
								Register here
							</Link>
						</Text>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LoginPage;
