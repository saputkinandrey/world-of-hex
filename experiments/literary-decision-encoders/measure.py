"""Synchronized phase measurements; RSS samples can miss transient peaks."""
import threading
import time

import psutil
import torch


def measured(call, device):
    process = psutil.Process()
    baseline = process.memory_info().rss
    peaks = [baseline]
    stop = threading.Event()

    def sample():
        while not stop.wait(0.01):
            peaks[0] = max(peaks[0], process.memory_info().rss)

    cuda = device == 'cuda'
    if cuda:
        torch.cuda.synchronize()
        torch.cuda.reset_peak_memory_stats()
    thread = threading.Thread(target=sample, daemon=True)
    thread.start()
    started = time.perf_counter()
    try:
        result = call()
        if cuda:
            torch.cuda.synchronize()
        elapsed = time.perf_counter() - started
    finally:
        stop.set()
        thread.join()
    memory = process.memory_info()
    return result, {
        'wall_seconds': elapsed,
        'rss_baseline_bytes': baseline,
        'rss_sampled_peak_bytes': max(peaks[0], memory.rss),
        'rss_sample_interval_seconds': 0.01,
        'process_lifetime_peak_rss_bytes': getattr(memory, 'peak_wset', None),
        'cuda_allocated_bytes': torch.cuda.memory_allocated() if cuda else None,
        'cuda_peak_allocated_bytes': torch.cuda.max_memory_allocated() if cuda else None,
        'cuda_peak_reserved_bytes': torch.cuda.max_memory_reserved() if cuda else None,
        'cuda_free_total_bytes': list(torch.cuda.mem_get_info()) if cuda else None,
    }
