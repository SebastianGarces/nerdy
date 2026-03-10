"use client";

import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, options);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	return res.json() as Promise<T>;
}

export interface Ad {
	id: string;
	briefId: string;
	primaryText: string;
	headline: string;
	description: string;
	callToAction: string;
	model?: string;
	promptTokens?: number;
	completionTokens?: number;
	latencyMs?: number;
	status: string;
	iteration: number;
	createdAt: string;
}

export interface DimensionScore {
	dimension: string;
	score: number;
	rationale: string;
}

export interface Evaluation {
	id: string;
	adId: string;
	dimensions: DimensionScore[];
	weightedScore: number;
	confidence: number;
	model?: string;
	tokensUsed?: number;
	createdAt: string;
}

export interface Stats {
	passRate: number;
	avgIterations: number;
	avgScore: number;
	totalAds: number;
	totalCost: number;
}

export interface Trend {
	date: string;
	avgScore: number;
	count: number;
}

interface AdsResponse {
	ads: Ad[];
	total: number;
}

interface AdDetailResponse {
	ad: Ad;
	evaluations: Evaluation[];
}

interface StatsResponse extends Stats {}

interface TrendsResponse {
	trends: Trend[];
}

export function useAds(params?: {
	limit?: number;
	offset?: number;
	status?: string;
}) {
	const searchParams = new URLSearchParams();
	if (params?.limit) searchParams.set("limit", String(params.limit));
	if (params?.offset) searchParams.set("offset", String(params.offset));
	if (params?.status && params.status !== "all")
		searchParams.set("status", params.status);

	const query = searchParams.toString();
	const path = `/api/ads${query ? `?${query}` : ""}`;

	return useQuery<AdsResponse>({
		queryKey: ["ads", params],
		queryFn: () => fetchApi<AdsResponse>(path),
	});
}

export function useAd(id: string) {
	return useQuery<AdDetailResponse>({
		queryKey: ["ad", id],
		queryFn: () => fetchApi<AdDetailResponse>(`/api/ads/${id}`),
		enabled: !!id,
	});
}

export function useStats() {
	return useQuery<StatsResponse>({
		queryKey: ["stats"],
		queryFn: () => fetchApi<StatsResponse>("/api/evaluations/stats"),
	});
}

export function useTrends() {
	return useQuery<TrendsResponse>({
		queryKey: ["trends"],
		queryFn: () => fetchApi<TrendsResponse>("/api/evaluations/trends"),
	});
}
