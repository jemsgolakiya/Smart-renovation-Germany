import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Heading from "../../components/Heading/Heading";
import Text from "../../components/Text/Text";

const Register: React.FC = () => {
	const [formData, setFormData] = useState({
		username: "",
		email: "",
		password: "",
		password_confirm: "",
		first_name: "",
		last_name: "",
	});
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const { register } = useAuth();
	const navigate = useNavigate();

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const validateForm = (): boolean => {
		if (!formData.username.trim()) {
			setError("Username is required");
			return false;
		}
		if (!formData.email.trim()) {
			setError("Email is required");
			return false;
		}
		if (!formData.password) {
			setError("Password is required");
			return false;
		}
		if (formData.password.length < 8) {
			setError("Password must be at least 8 characters long");
			return false;
		}
		if (formData.password !== formData.password_confirm) {
			setError("Passwords do not match");
			return false;
		}
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			await register(formData);
			navigate("/");
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Registration failed. Please try again.";
			// Handle Django validation errors
			if (typeof err === 'object' && err !== null && 'response' in err) {
				const response = (err as any).response;
				if (response && response.data) {
					const data = response.data;
					if (typeof data === 'object') {
						const firstError = Object.values(data)[0];
						if (Array.isArray(firstError)) {
							setError(firstError[0] as string);
						} else if (typeof firstError === 'string') {
							setError(firstError);
						} else {
							setError(errorMessage);
						}
					} else {
						setError(errorMessage);
					}
				} else {
					setError(errorMessage);
				}
			} else {
				setError(errorMessage);
			}
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
							Create Account
						</Heading>
						<Text className="text-gray-600">Join RenovAlte today</Text>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
								{error}
							</div>
						)}

						<div>
							<label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
								Username *
							</label>
							<input
								type="text"
								id="username"
								name="username"
								value={formData.username}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
								required
								autoComplete="username"
							/>
						</div>

						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
								Email *
							</label>
							<input
								type="email"
								id="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
								required
								autoComplete="email"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
									First Name
								</label>
								<input
									type="text"
									id="first_name"
									name="first_name"
									value={formData.first_name}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
									autoComplete="given-name"
								/>
							</div>
							<div>
								<label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
									Last Name
								</label>
								<input
									type="text"
									id="last_name"
									name="last_name"
									value={formData.last_name}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
									autoComplete="family-name"
								/>
							</div>
						</div>

						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
								Password *
							</label>
							<input
								type="password"
								id="password"
								name="password"
								value={formData.password}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
								required
								minLength={8}
								autoComplete="new-password"
							/>
							<Text className="text-xs text-gray-500 mt-1">Must be at least 8 characters</Text>
						</div>

						<div>
							<label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-1">
								Confirm Password *
							</label>
							<input
								type="password"
								id="password_confirm"
								name="password_confirm"
								value={formData.password_confirm}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
								required
								autoComplete="new-password"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? "Creating account..." : "Register"}
						</button>
					</form>

					<div className="mt-6 text-center">
						<Text className="text-sm text-gray-600">
							Already have an account?{" "}
							<Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
								Login here
							</Link>
						</Text>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Register;

